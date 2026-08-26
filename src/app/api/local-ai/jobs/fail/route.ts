import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({ jobId: z.uuid(), error: z.string().trim().min(1).max(500) })
function bearer(request: Request) { const value = request.headers.get("authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : "" }

export async function POST(request: Request) {
  const token = bearer(request)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!token || !parsed.success) return NextResponse.json({ error: "Unauthorised helper request." }, { status: 401 })
  const admin = createAdminClient()
  const { error } = await admin.rpc("fail_local_ai_job", { p_agent_token: token, p_error_message: parsed.data.error, p_job_id: parsed.data.jobId })
  return error ? NextResponse.json({ error: "Local analysis failure was rejected." }, { status: 409 }) : NextResponse.json({ ok: true })
}
