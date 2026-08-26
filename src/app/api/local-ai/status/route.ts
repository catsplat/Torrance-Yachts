import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({ model: z.string().trim().max(128).optional(), status: z.enum(["available", "offline"]) })

function bearer(request: Request) { const value = request.headers.get("authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : "" }

export async function POST(request: Request) {
  const token = bearer(request)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!token || !parsed.success) return NextResponse.json({ error: "Unauthorised helper request." }, { status: 401 })
  const admin = createAdminClient()
  const { error } = await admin.rpc("report_local_ai_agent_status", { p_agent_token: token, p_model: parsed.data.model, p_status: parsed.data.status })
  return error ? NextResponse.json({ error: "Helper token is invalid." }, { status: 401 }) : NextResponse.json({ ok: true })
}
