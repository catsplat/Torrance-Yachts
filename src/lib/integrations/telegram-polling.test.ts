import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), process: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock("./telegram-updates", () => ({ processTelegramUpdate: mocks.process }))
import { pollTelegramUpdates } from "./telegram-polling"

describe("Telegram outbound receiver", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("TELEGRAM_RECEIVE_MODE", "polling")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "synthetic-secret")
    mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data: name === "claim_telegram_poll" ? [{ lease_id: "lease", next_offset: 10 }] : true }))
    mocks.process.mockResolvedValue(false)
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it("persists progress only after processing and bounds the Telegram request", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, result: [{ update_id: 10 }, { update_id: 11 }] }))
    vi.stubGlobal("fetch", fetcher)
    expect(await pollTelegramUpdates()).toEqual({ configured: true, processed: 2 })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ offset: 10, limit: 25, timeout: 0, allowed_updates: ["message"] })
    expect(mocks.rpc).toHaveBeenLastCalledWith("finish_telegram_poll", expect.objectContaining({ p_next_offset: 12, p_error: undefined }))
  })
  it("retains the failed update for retry without leaking provider secrets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, result: [{ update_id: 10 }, { update_id: 11 }] })))
    mocks.process.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("synthetic-secret"))
    await expect(pollTelegramUpdates()).rejects.toThrow("Telegram receive failed")
    expect(mocks.rpc).toHaveBeenLastCalledWith("finish_telegram_poll", expect.objectContaining({ p_next_offset: 11, p_error: expect.not.stringContaining("synthetic-secret") }))
  })
  it("does not poll in webhook mode", async () => {
    vi.stubEnv("TELEGRAM_RECEIVE_MODE", "webhook")
    expect(await pollTelegramUpdates()).toEqual({ configured: false, processed: 0 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it("does not acknowledge progress when lease persistence fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, result: [] })))
    mocks.rpc.mockResolvedValueOnce({ data: [{ lease_id: "lease", next_offset: 10 }], error: null }).mockResolvedValueOnce({ data: false, error: null })
    await expect(pollTelegramUpdates()).rejects.toThrow("progress was not saved")
  })
})
