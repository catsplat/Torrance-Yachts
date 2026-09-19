import { describe, expect, it, vi } from "vitest"
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: "connected", error: null }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }))
import { processTelegramUpdate } from "./telegram-updates"

describe("private Telegram pairing", () => {
  const text = `/start ty_${"a".repeat(43)}`
  it("ignores group chats without redeeming the token", async () => {
    rpc.mockClear()
    expect(await processTelegramUpdate({ message: { chat: { id: -123, type: "group" }, text } })).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })
  it("redeems only a hashed token from a private chat", async () => {
    expect(await processTelegramUpdate({ message: { chat: { id: 123, type: "private" }, text } })).toBe(true)
    expect(rpc).toHaveBeenCalledWith("complete_telegram_pairing", { p_telegram_chat_id: "123", p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/) })
  })
})
