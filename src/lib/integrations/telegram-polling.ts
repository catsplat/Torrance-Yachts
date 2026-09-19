import "server-only"
import { createHash } from "node:crypto"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { processTelegramUpdate } from "./telegram-updates"

const resultSchema = z.object({ ok: z.literal(true), result: z.array(z.object({ update_id: z.number().int().nonnegative().safe() }).passthrough()).max(25) })

export async function pollTelegramUpdates() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (process.env.TELEGRAM_RECEIVE_MODE !== "polling" || !token) return { configured: false, processed: 0 }
  const admin = createAdminClient()
  const botKey = createHash("sha256").update(token).digest("hex")
  const { data, error } = await admin.rpc("claim_telegram_poll", { p_bot_key: botKey })
  if (error) throw new Error("Telegram receiver lease unavailable")
  const lease = data?.[0]
  if (!lease) return { configured: true, processed: 0, busy: true }
  let offset = lease.next_offset
  let processed = 0
  let failure: string | undefined
  const deadline = Date.now() + 20_000
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: "POST", headers: { "content-type": "application/json" }, redirect: "error",
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ offset, limit: 25, timeout: 0, allowed_updates: ["message"] }),
    })
    if (!response.ok) throw new Error(response.status === 409 ? "Telegram polling conflicts with an existing webhook or receiver" : "Telegram receiver request failed")
    const result = resultSchema.safeParse(await response.json())
    if (!result.success) throw new Error("Invalid Telegram receiver response")
    for (const update of result.data.result.sort((a,b) => a.update_id-b.update_id)) {
      if (Date.now() >= deadline) break
      if (update.update_id < offset) continue
      await processTelegramUpdate(update)
      offset = update.update_id + 1
      processed += 1
    }
  } catch {
    // Never retain fetch errors containing the secret-bearing Telegram URL.
    failure = "Telegram receive failed; check bot credentials, webhook conflict and connectivity."
  }
  const completion = await admin.rpc("finish_telegram_poll", {
    p_bot_key: botKey, p_lease_id: lease.lease_id, p_next_offset: offset, p_error: failure,
  })
  if (completion.error || !completion.data) throw new Error("Telegram receiver progress was not saved")
  if (failure) throw new Error(failure)
  return { configured: true, processed }
}
