import { NextResponse } from "next/server"

import {
  dispatchInternalAlert,
  safeDeliveryFailure,
} from "@/lib/integrations/alert-dispatch"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"

const workerId = "application-internal-alert-dispatcher"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("claim_internal_alert_deliveries", {
    p_limit: 10,
    p_worker_id: workerId,
  })
  if (error) {
    return NextResponse.json({ error: "Internal alert claim failed" }, { status: 500 })
  }
  let delivered = 0
  let failed = 0
  for (const delivery of data ?? []) {
    try {
      const result = await dispatchInternalAlert(admin, delivery)
      const { error: completionError } = await admin.rpc("complete_integration_delivery", {
        p_delivery_id: delivery.id,
        p_external_id: result.externalId,
        p_external_url: result.externalUrl,
        p_worker_id: workerId,
      })
      if (completionError) throw new Error("Delivery completion could not be recorded.")
      delivered += 1
    } catch (deliveryError) {
      const failure = safeDeliveryFailure(deliveryError)
      await admin.rpc("fail_integration_delivery", {
        p_delivery_id: delivery.id,
        p_error_code: failure.errorCode,
        p_error_message: failure.errorMessage,
        p_retryable: failure.retryable,
        p_worker_id: workerId,
      })
      failed += 1
    }
  }
  return NextResponse.json({ claimed: data?.length ?? 0, delivered, failed })
}
