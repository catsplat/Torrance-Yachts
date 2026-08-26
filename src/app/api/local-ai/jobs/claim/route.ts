import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

function bearer(request: Request) { const value = request.headers.get("authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : "" }

export async function POST(request: Request) {
  const token = bearer(request)
  if (!token) return NextResponse.json({ error: "Unauthorised helper request." }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("claim_local_ai_job", { p_agent_token: token })
  if (error) return NextResponse.json({ error: "No local analysis job is available." }, { status: 204 })
  const job = data?.[0]
  return job ? NextResponse.json(job) : new NextResponse(null, { status: 204 })
}
