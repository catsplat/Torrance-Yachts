import "server-only"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { extractTelegramPairingToken, hashTelegramPairingToken } from "./telegram-pairing"

const pairingMessage = z.object({ message: z.object({
  chat: z.object({ id: z.number().int().positive().safe(), type: z.literal("private") }),
  text: z.string().max(4096),
}) })

export async function processTelegramUpdate(update: unknown) {
  const parsed = pairingMessage.safeParse(update)
  if (!parsed.success) return false
  const token = extractTelegramPairingToken(parsed.data.message.text)
  if (!token) return false
  const { data, error } = await createAdminClient().rpc("complete_telegram_pairing", {
    p_telegram_chat_id: String(parsed.data.message.chat.id),
    p_token_hash: hashTelegramPairingToken(token),
  })
  if (error) throw new Error("Telegram pairing could not be recorded")
  return data === "connected"
}
