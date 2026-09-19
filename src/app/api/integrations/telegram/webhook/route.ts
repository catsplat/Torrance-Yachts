import { NextResponse } from "next/server"

import {
  hasValidTelegramWebhookSecret,
} from "@/lib/integrations/telegram-pairing"
import { processTelegramUpdate } from "@/lib/integrations/telegram-updates"

export async function POST(request: Request) {
  if (process.env.TELEGRAM_RECEIVE_MODE === "polling" || !hasValidTelegramWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const paired = await processTelegramUpdate(await request.json().catch(() => null))
    return NextResponse.json({ accepted: true, paired })
  } catch {
    return NextResponse.json({ error: "Telegram pairing is unavailable" }, { status: 503 })
  }
}
