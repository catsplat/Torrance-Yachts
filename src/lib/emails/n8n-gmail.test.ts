import { describe, expect, it } from "vitest"

import { normaliseN8nGmailMessage } from "./n8n-gmail"

const rawMessage = {
  cc: { value: [{ address: "ops@example.test", name: "Operations" }] },
  date: "2026-07-27T09:30:00.000Z",
  from: { text: "Alex Morgan <alex@example.test>", value: [{ address: "alex@example.test", name: "Alex Morgan" }] },
  headers: {
    "content-type": "Content-Type: multipart/mixed; boundary=sample",
    "list-id": "List-ID: charter-news.example.test",
    "list-unsubscribe": "List-Unsubscribe: <mailto:unsubscribe@example.test>",
  },
  html: false,
  id: "gmail-message-1",
  labelIds: ["INBOX", "UNREAD"],
  messageId: "<message-1@example.test>",
  subject: "August charter enquiry",
  text: "Please advise availability for seven nights.",
  threadId: "gmail-thread-1",
  to: { value: [{ address: "charters@example.test", name: "Charters" }] },
}

describe("n8n Gmail trigger normalisation", () => {
  it("maps an unsimplified trigger item into the durable ingestion contract", () => {
    const result = normaliseN8nGmailMessage(rawMessage)
    expect(result).toMatchObject({
      body_text: "Please advise availability for seven nights.",
      cc_emails: ["ops@example.test"],
      has_attachments: true,
      has_list_id: true,
      has_list_unsubscribe: true,
      is_bulk: true,
      provider_event_id: "gmail:gmail-message-1",
      provider_message_id: "gmail-message-1",
      provider_thread_id: "gmail-thread-1",
      recipient_emails: ["charters@example.test"],
      sender_email: "alex@example.test",
      sender_name: "Alex Morgan",
    })
  })

  it("uses Delivered-To for BCC-style messages and creates a stable replay key", () => {
    const first = normaliseN8nGmailMessage({
      ...rawMessage,
      headers: { "delivered-to": "Delivered-To: private@example.test" },
      to: undefined,
    })
    const replay = normaliseN8nGmailMessage({
      ...rawMessage,
      headers: { "delivered-to": "Delivered-To: private@example.test" },
      to: undefined,
    })
    expect(first.recipient_emails).toEqual(["private@example.test"])
    expect(replay.provider_event_id).toBe(first.provider_event_id)
  })

  it("rejects messages without a usable sender or recipient", () => {
    expect(() => normaliseN8nGmailMessage({ ...rawMessage, from: "not-an-address" })).toThrow()
    expect(() => normaliseN8nGmailMessage({ ...rawMessage, headers: {}, to: undefined })).toThrow()
  })
})
