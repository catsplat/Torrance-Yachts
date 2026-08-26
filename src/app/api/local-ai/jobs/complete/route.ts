import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

const schema = z.object({
  jobId: z.uuid(),
  result: z.unknown(),
  providerRequestId: z.string().trim().max(200).optional(),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
})
function bearer(request: Request) { const value = request.headers.get("authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : "" }

export async function POST(request: Request) {
  const token = bearer(request)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!token || !parsed.success) return NextResponse.json({ error: "Unauthorised helper request." }, { status: 401 })
  const admin = createAdminClient()
  const { error } = await admin.rpc("complete_local_ai_job", {
    p_agent_token: token, p_input_tokens: parsed.data.inputTokens ?? undefined, p_job_id: parsed.data.jobId,
    p_output_tokens: parsed.data.outputTokens ?? undefined, p_provider_request_id: parsed.data.providerRequestId ?? undefined,
    p_result_payload: parsed.data.result as Json,
  })
  return error ? NextResponse.json({ error: "Local analysis result was rejected." }, { status: 409 }) : NextResponse.json({ ok: true })
}
