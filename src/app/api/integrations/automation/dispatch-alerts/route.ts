import { NextResponse } from "next/server"

import {
  dispatchInternalAlert,
  safeDeliveryFailure,
} from "@/lib/integrations/alert-dispatch"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { consumeRateLimit } from "@/lib/security/rate-limit"

const workerId = "application-internal-alert-dispatcher"
const maximumBatchSize = 12
const concurrency = 3
const routeDeadlineMs = 25_000

type DispatchResult = {
  delivered: boolean
  failureRecorded: boolean
}

async function processDelivery(
  admin: ReturnType<typeof createAdminClient>,
  delivery: Parameters<typeof dispatchInternalAlert>[1],
  deadline: number,
): Promise<DispatchResult> {
  try {
    const remainingMs = Math.max(1, deadline - Date.now())
    const result = await dispatchInternalAlert(
      admin,
      delivery,
      AbortSignal.timeout(Math.min(10_000, remainingMs)),
    )
    const { error: completionError } = await admin.rpc("complete_integration_delivery", {
      p_delivery_id: delivery.id,
      p_external_id: result.externalId,
      p_external_url: result.externalUrl,
      p_worker_id: workerId,
    })
    if (completionError) throw new Error("Delivery completion could not be recorded.")
    if (delivery.provider === "gmail" && delivery.credential_user_id) {
      await admin.rpc("record_google_oauth_health", {
        p_requires_reauthentication: false,
        p_succeeded: true,
        p_user_id: delivery.credential_user_id,
      })
    }
    return { delivered: true, failureRecorded: false }
  } catch (deliveryError) {
    const failure = safeDeliveryFailure(deliveryError)
    if (failure.requiresReauthentication && delivery.credential_user_id) {
      await admin.rpc("record_google_oauth_health", {
        p_error: "Google access expired or was revoked.",
        p_requires_reauthentication: true,
        p_succeeded: false,
        p_user_id: delivery.credential_user_id,
      })
    }
    const { error: failureError } = await admin.rpc("fail_integration_delivery", {
      p_delivery_id: delivery.id,
      p_error_code: failure.errorCode,
      p_error_message: failure.errorMessage,
      p_retryable: failure.retryable,
      p_worker_id: workerId,
    })
    return { delivered: false, failureRecorded: !failureError }
  }
}

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!await consumeRateLimit("automation_alerts", 120, 60)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("claim_internal_alert_deliveries", {
    p_limit: maximumBatchSize,
    p_worker_id: workerId,
  })
  if (error) {
    return NextResponse.json({ error: "Internal alert claim failed" }, { status: 500 })
  }
  const deliveries = data ?? []
  const deadline = Date.now() + routeDeadlineMs
  const results: DispatchResult[] = []
  for (let offset = 0; offset < deliveries.length && Date.now() < deadline; offset += concurrency) {
    const group = deliveries.slice(offset, offset + concurrency)
    results.push(...await Promise.all(group.map((delivery) => processDelivery(admin, delivery, deadline))))
  }
  const delivered = results.filter((result) => result.delivered).length
  const failureRecordingErrors = results.filter((result) => !result.delivered && !result.failureRecorded).length
  if (failureRecordingErrors) {
    return NextResponse.json({
      claimed: deliveries.length,
      delivered,
      error: "One or more provider failures could not be recorded; their leases will recover automatically.",
      failed: results.length - delivered,
      failure_recording_errors: failureRecordingErrors,
      timed_out: results.length < deliveries.length,
    }, { status: 503 })
  }
  return NextResponse.json({
    claimed: deliveries.length,
    delivered,
    failed: results.length - delivered,
    timed_out: results.length < deliveries.length,
  })
}
