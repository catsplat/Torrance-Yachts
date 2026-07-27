import { NextResponse } from "next/server"

import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { isAllowedAutomationWorker } from "@/lib/integrations/automation-worker"
import { deliveryFailureSchema } from "@/lib/integrations/validation"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = deliveryFailureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid failure result" }, { status: 422 })
  }
  if (!isAllowedAutomationWorker(parsed.data.workerId)) {
    return NextResponse.json({ error: "The development delivery simulator is disabled outside local development." }, { status: 403 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("fail_integration_delivery", {
    p_delivery_id: id,
    p_error_code: parsed.data.errorCode,
    p_error_message: parsed.data.errorMessage,
    p_retryable: parsed.data.retryable,
    p_worker_id: parsed.data.workerId,
  })
  if (error) return NextResponse.json({ error: "Failure result was rejected" }, { status: 409 })
  return new NextResponse(null, { status: 204 })
}
