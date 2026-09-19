import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ from: vi.fn(), cleanup: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }))
import { PairedLocalAiProvider } from "./paired-local-provider"
import type { EmailAiInput } from "./provider"

describe("paired AI job lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cleanup.mockResolvedValue({ error: null })
    mocks.from.mockImplementation(() => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: "job" }, error: null }) }) }),
      select: () => ({ eq: () => ({ single: async () => ({ data: { status: "failed", error_message: "Helper offline" }, error: null }) }) }),
      update: () => ({ eq: () => ({ in: mocks.cleanup }) }),
    }))
  })
  function analyze(signal?: AbortSignal) {
    return new PairedLocalAiProvider({ agentId: "agent", model: "synthetic", summaryStyle: "concise", userId: "owner" })
      .analyzeEmail({} as EmailAiInput, "synthetic", signal)
  }
  it("retires outstanding jobs when the caller aborts", async () => {
    const controller = new AbortController()
    controller.abort(new Error("Cancelled"))
    await expect(analyze(controller.signal)).rejects.toThrow("Cancelled")
    expect(mocks.cleanup).toHaveBeenCalledWith("status", ["pending", "claimed"])
  })
  it("preserves a helper failure and retires only unfinished work", async () => {
    await expect(analyze()).rejects.toThrow("Helper offline")
    expect(mocks.cleanup).toHaveBeenCalledOnce()
  })
  it("surfaces failed cleanup instead of claiming the queue is safe", async () => {
    mocks.cleanup.mockResolvedValue({ error: { message: "unavailable" } })
    await expect(analyze()).rejects.toThrow("cleanup failed")
  })
})
