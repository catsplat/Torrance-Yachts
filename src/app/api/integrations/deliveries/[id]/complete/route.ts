import { NextResponse } from "next/server"

import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { deliveryCompletionSchema } from "@/lib/integrations/validation"
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
  const parsed = deliveryCompletionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid completion result" }, { status: 422 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("complete_integration_delivery", {
    p_delivery_id: id,
    p_external_id: parsed.data.externalId,
    p_external_url: parsed.data.externalUrl,
    p_worker_id: parsed.data.workerId,
  })
  if (error) return NextResponse.json({ error: "Completion was rejected" }, { status: 409 })
  return new NextResponse(null, { status: 204 })
}
