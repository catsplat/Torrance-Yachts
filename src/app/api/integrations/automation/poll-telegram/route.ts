import { NextResponse } from "next/server"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { pollTelegramUpdates } from "@/lib/integrations/telegram-polling"
import { consumeRateLimit } from "@/lib/security/rate-limit"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!await consumeRateLimit("telegram_poll", 30, 60)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  try { return NextResponse.json(await pollTelegramUpdates()) }
  catch { return NextResponse.json({ error: "Telegram receiver unavailable" }, { status: 503 }) }
}
