import { describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), reconcile: vi.fn(), ingest: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock("@/lib/emails/google-gmail", () => ({ reconcileGoogleGmail: mocks.reconcile }))
vi.mock("@/lib/emails/ingestion", () => ({ ingestGmailMessage: mocks.ingest }))
import { reconcileConfiguredGmailMailbox } from "./gmail-reconciliation"

describe("owner-bound Gmail batch", () => {
  it("processes both owners even when the first provider fails", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data: name === "get_active_gmail_ingestion_credentials" ? [{ user_id: "a" }, { user_id: "b" }] : null }))
    mocks.reconcile.mockRejectedValueOnce(new Error("private provider error"))
      .mockImplementationOnce(async ({ ingest }) => { await ingest({ synthetic: true }); return { historyId: "2", processed: 1, initialized: false, recovered: false } })
    const result = await reconcileConfiguredGmailMailbox()
    expect(result.processed).toBe(1)
    expect(result.failed).toBe(1)
    expect(mocks.ingest).toHaveBeenCalledWith({ synthetic: true }, "b")
    expect(mocks.rpc).toHaveBeenCalledWith("complete_gmail_reconciliation", expect.objectContaining({ p_user_id: "b" }))
    expect(mocks.rpc).toHaveBeenCalledWith("fail_gmail_reconciliation", expect.objectContaining({ p_user_id: "a", p_error: expect.not.stringContaining("private provider error") }))
  })
})
