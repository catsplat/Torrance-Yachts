import { NextResponse } from "next/server"

import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { isAllowedAutomationWorker } from "@/lib/integrations/automation-worker"
import { deliveryClaimSchema } from "@/lib/integrations/validation"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = deliveryClaimSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid claim request" }, { status: 422 })
  }
  if (!isAllowedAutomationWorker(parsed.data.workerId)) {
    return NextResponse.json({ error: "The development delivery simulator is disabled outside local development." }, { status: 403 })
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = parsed.data.operations
      ? await supabase.rpc("claim_integration_deliveries_for_operations", {
        p_limit: parsed.data.limit,
        p_operations: parsed.data.operations,
        p_worker_id: parsed.data.workerId,
      })
      : await supabase.rpc("claim_integration_deliveries", {
        p_limit: parsed.data.limit,
        p_worker_id: parsed.data.workerId,
      })
    if (error) return NextResponse.json({ error: "Delivery claim failed" }, { status: 500 })
    const origin = new URL(request.url).origin
    return NextResponse.json({
      deliveries: (data ?? []).map((delivery) => ({
        ...delivery,
        fileUrl: delivery.operation === "drive_upload"
          ? `${origin}/api/integrations/deliveries/${delivery.id}/file`
          : null,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Automation is not configured" }, { status: 503 })
  }
}
