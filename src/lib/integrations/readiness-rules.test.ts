import { describe, expect, it } from "vitest"

import { deriveGmailIngestionState } from "./readiness-rules"

describe("Gmail ingestion activation state", () => {
  const now = new Date("2026-07-17T12:00:00.000Z")

  it("requires configuration before it can be tested", () => {
    expect(deriveGmailIngestionState({ connectionEnabled: false, ingestionTokenConfigured: true, lastReceivedAt: null, now })).toBe("setup_required")
    expect(deriveGmailIngestionState({ connectionEnabled: true, ingestionTokenConfigured: false, lastReceivedAt: null, now })).toBe("setup_required")
  })

  it("requests verification when configured but no recent mail has arrived", () => {
    expect(deriveGmailIngestionState({ connectionEnabled: true, ingestionTokenConfigured: true, lastReceivedAt: null, now })).toBe("attention")
    expect(deriveGmailIngestionState({ connectionEnabled: true, ingestionTokenConfigured: true, lastReceivedAt: "2026-07-01T12:00:00.000Z", now })).toBe("attention")
  })

  it("is ready after recent successful ingestion", () => {
    expect(deriveGmailIngestionState({ connectionEnabled: true, ingestionTokenConfigured: true, lastReceivedAt: "2026-07-16T12:00:00.000Z", now })).toBe("ready")
  })
})
