import { describe, expect, it } from "vitest"

import { createOfflineRehearsalEmail, offlineEmailKinds } from "./offline-email"

describe("offline rehearsal email", () => {
  it("uses a valid, clearly synthetic payload compatible with the Gmail boundary", () => {
    const email = createOfflineRehearsalEmail()

    expect(email.sender_email).toMatch(/^alex\.[a-f0-9]{8}@example\.test$/)
    expect(email.provider_event_id).toMatch(/^offline-rehearsal:new_enquiry:/)
    expect(email.gmail_label_ids).toContain("OFFLINE_REHEARSAL")
    expect(email.body_text).toContain("M/Y Asteria")
  })

  it("creates every documented fictional route with a stable replay identifier", () => {
    const runId = "test-run"
    const fixtures = offlineEmailKinds.map((kind) => createOfflineRehearsalEmail(kind, { runId }))
    expect(new Set(fixtures.map((fixture) => fixture.provider_event_id)).size).toBe(5)
    expect(createOfflineRehearsalEmail("circular", { runId }).has_list_unsubscribe).toBe(true)
    expect(createOfflineRehearsalEmail("internal", { runId, internalDomain: "internal.example.test" }).sender_email)
      .toBe("operations@internal.example.test")
    expect(createOfflineRehearsalEmail("new_enquiry", { runId }).provider_event_id)
      .toBe(createOfflineRehearsalEmail("new_enquiry", { runId }).provider_event_id)
  })
})
