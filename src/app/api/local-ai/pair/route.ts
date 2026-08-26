import { NextResponse } from "next/server"
import { z } from "zod"

import { consumeRateLimit } from "@/lib/security/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({ pairingCode: z.string().trim().length(12), deviceName: z.string().trim().min(2).max(120) })

export async function POST(request: Request) {
  if (!await consumeRateLimit("local_ai_pair", 10, 600)) return NextResponse.json({ error: "Too many pairing attempts." }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid pairing request." }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("redeem_local_ai_pairing_code", { p_device_name: parsed.data.deviceName, p_pairing_code: parsed.data.pairingCode })
  const paired = data?.[0]
  if (error || !paired) return NextResponse.json({ error: "Pairing code is invalid or expired." }, { status: 400 })
  return NextResponse.json({ agentId: paired.agent_id, agentToken: paired.agent_token })
}
