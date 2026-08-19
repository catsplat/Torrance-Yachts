import { describe, expect, it } from "vitest"

import { normaliseImapMessage } from "./imap-normalise"

describe("IMAP message normalisation", () => {
  it("maps a TLS IMAP message into the existing owner-aware ingestion contract", () => {
    const message = normaliseImapMessage({
      accountEmail: "owner@example.test",
      connectionId: "a0000000-0000-4000-8000-000000000001",
      flags: new Set(["\\Seen"]),
      folder: "INBOX",
      internalDate: new Date("2026-08-19T09:00:00Z"),
      source: Buffer.from([
        "From: Broker <broker@example.test>",
        "To: owner@example.test",
        "Message-ID: <test-1@example.test>",
        "Subject: Charter availability",
        "",
        "Please advise whether the yacht is available.",
      ].join("\r\n")),
      uid: 42,
      uidValidity: "99",
    })

    expect(message.provider_event_id).toContain(":99:42")
    expect(message.sender_email).toBe("broker@example.test")
    expect(message.recipient_emails).toContain("owner@example.test")
    expect(message.subject).toBe("Charter availability")
  })

  it("uses stable IMAP message identifiers to make a repeated sync idempotent", () => {
    const input = {
      accountEmail: "owner@example.test", connectionId: "a0000000-0000-4000-8000-000000000001",
      flags: new Set<string>(), folder: "INBOX", internalDate: new Date("2026-08-19T09:00:00Z"),
      source: Buffer.from("From: sender@example.test\r\nSubject: Test\r\n\r\nHello"), uid: 7, uidValidity: "1",
    }
    expect(normaliseImapMessage(input).provider_event_id).toBe(normaliseImapMessage(input).provider_event_id)
  })
})
