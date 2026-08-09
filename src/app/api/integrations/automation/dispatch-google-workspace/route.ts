import { NextResponse } from "next/server"

import {
  safeGoogleProviderFailure,
} from "@/lib/integrations/google-provider"
import {
  dispatchGoogleWorkspaceDelivery,
  getGoogleDispatchConnections,
  getGoogleDispatchCredentials,
} from "@/lib/integrations/google-provider-server"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"

const workerId = "application-google-workspace-dispatcher"
const operations = ["calendar_upsert", "drive_upload", "sheets_snapshot"] as const
const maximumBatchSize = 9
const concurrency = 3
const routeDeadlineMs = 25_000

type DispatchResult = { delivered: boolean; failureRecorded: boolean }

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("claim_integration_deliveries_for_operations", {
    p_limit: maximumBatchSize,
    p_operations: [...operations],
    p_worker_id: workerId,
  })
  if (error) return NextResponse.json({ error: "Google delivery claim failed" }, { status: 500 })
  const deliveries = data ?? []
  if (!deliveries.length) return NextResponse.json({ claimed: 0, delivered: 0, failed: 0, timed_out: false })

  let credentials
  let connections
  try {
    ;[credentials, connections] = await Promise.all([
      getGoogleDispatchCredentials(admin),
      getGoogleDispatchConnections(admin),
    ])
  } catch (configurationError) {
    const failure = safeGoogleProviderFailure(configurationError)
    const results = await Promise.all(deliveries.map((delivery) => admin.rpc("fail_integration_delivery", {
      p_delivery_id: delivery.id,
      p_error_code: failure.errorCode,
      p_error_message: failure.errorMessage,
      p_retryable: false,
      p_worker_id: workerId,
    })))
    const unrecorded = results.filter((result) => result.error).length
    return NextResponse.json({
      claimed: deliveries.length,
      delivered: 0,
      failed: deliveries.length,
      failure_recording_errors: unrecorded,
      timed_out: false,
    }, { status: unrecorded ? 503 : 200 })
  }

  const deadline = Date.now() + routeDeadlineMs
  const results: DispatchResult[] = []
  for (let offset = 0; offset < deliveries.length && Date.now() < deadline; offset += concurrency) {
    const group = deliveries.slice(offset, offset + concurrency)
    results.push(...await Promise.all(group.map(async (delivery): Promise<DispatchResult> => {
      try {
        const remainingMs = Math.max(1, deadline - Date.now())
        const result = await dispatchGoogleWorkspaceDelivery(
          admin,
          credentials,
          connections,
          delivery,
          AbortSignal.timeout(Math.min(12_000, remainingMs)),
        )
        const completion = await admin.rpc("complete_integration_delivery", {
          p_delivery_id: delivery.id,
          p_external_id: result.externalId,
          p_external_url: result.externalUrl,
          p_worker_id: workerId,
        })
        if (completion.error) throw new Error("Google delivery completion could not be recorded.")
        return { delivered: true, failureRecorded: false }
      } catch (deliveryError) {
        const failure = safeGoogleProviderFailure(deliveryError)
        const recorded = await admin.rpc("fail_integration_delivery", {
          p_delivery_id: delivery.id,
          p_error_code: failure.errorCode,
          p_error_message: failure.errorMessage,
          p_retryable: failure.retryable,
          p_worker_id: workerId,
        })
        return { delivered: false, failureRecorded: !recorded.error }
      }
    })))
  }
  const delivered = results.filter((result) => result.delivered).length
  const failureRecordingErrors = results.filter((result) => !result.delivered && !result.failureRecorded).length
  const response = {
    claimed: deliveries.length,
    delivered,
    failed: results.length - delivered,
    failure_recording_errors: failureRecordingErrors,
    timed_out: results.length < deliveries.length,
  }
  return NextResponse.json(response, { status: failureRecordingErrors ? 503 : 200 })
}
