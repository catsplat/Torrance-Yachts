import { NextResponse } from "next/server"
import { z } from "zod"

import {
  extractTelegramPairingToken,
  hasValidTelegramWebhookSecret,
  hashTelegramPairingToken,
} from "@/lib/integrations/telegram-pairing"
import { createAdminClient } from "@/lib/supabase/admin"

const telegramUpdateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.union([z.number().int(), z.string().regex(/^-?[0-9]{1,63}$/u)]) }),
    text: z.string().max(4096).optional(),
  }).optional(),
}).passthrough()

export async function POST(request: Request) {
  if (!hasValidTelegramWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const parsed = telegramUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !parsed.data.message) return NextResponse.json({ accepted: true })
  const token = extractTelegramPairingToken(parsed.data.message.text)
  if (!token) return NextResponse.json({ accepted: true })

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc("complete_telegram_pairing", {
      p_telegram_chat_id: String(parsed.data.message.chat.id),
      p_token_hash: hashTelegramPairingToken(token),
    })
    if (error) return NextResponse.json({ error: "Pairing could not be recorded" }, { status: 500 })
    return NextResponse.json({ accepted: true, paired: data === "connected" })
  } catch {
    return NextResponse.json({ error: "Telegram pairing is unavailable" }, { status: 503 })
  }
}
