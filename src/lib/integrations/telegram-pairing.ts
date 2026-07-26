import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function createTelegramPairingToken() {
  return randomBytes(32).toString("base64url")
}

export function hashTelegramPairingToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function createTelegramPairingUrl(botUsername: string, token: string) {
  return `https://t.me/${botUsername}?start=ty_${token}`
}

export function extractTelegramPairingToken(text: string | undefined) {
  const match = text?.trim().match(/^\/start\s+ty_([A-Za-z0-9_-]{43})$/u)
  return match?.[1] ?? null
}

export function hasValidTelegramWebhookSecret(request: Request) {
  const configured = process.env.TELEGRAM_WEBHOOK_SECRET
  const supplied = request.headers.get("x-telegram-bot-api-secret-token")
  if (!configured || !supplied) return false
  const expected = Buffer.from(configured)
  const received = Buffer.from(supplied)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function getTelegramPairingConfiguration() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "")
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!botUsername || !/^[A-Za-z0-9_]{5,32}bot$/iu.test(botUsername) || !webhookSecret) {
    return { configured: false as const }
  }
  return { botUsername, configured: true as const }
}
