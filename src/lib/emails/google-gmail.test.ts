import { describe, expect, it, vi } from "vitest"

import { normaliseGoogleGmailMessage, reconcileGoogleGmail } from "./google-gmail"
import type { GoogleWorkspaceCredentials } from "../integrations/google-workspace"

const credentials: GoogleWorkspaceCredentials = {
  account_email: "inbox@example.test",
  client_id: "synthetic-client",
  client_secret: "synthetic-secret",
  refresh_token: "synthetic-refresh",
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
}

const encoded = (value: string) => Buffer.from(value).toString("base64url")
const message = {
  historyId: "102",
  id: "message-1",
  internalDate: "1786269600000",
  labelIds: ["INBOX", "UNREAD"],
  payload: {
    body: { size: 0 },
    filename: "",
    headers: [
      { name: "From", value: "Alex Morgan <alex@example.test>" },
      { name: "To", value: "Charters <inbox@example.test>" },
      { name: "Subject", value: "August charter enquiry" },
      { name: "Message-ID", value: "<message-1@example.test>" },
    ],
    mimeType: "multipart/mixed",
    parts: [
      { body: { data: encoded("Please advise availability for seven nights."), size: 46 }, filename: "", headers: [], mimeType: "text/plain", parts: [] },
      { body: { attachmentId: "attachment-1", size: 1200 }, filename: "requirements.pdf", headers: [], mimeType: "application/pdf", parts: [] },
    ],
  },
  snippet: "Please advise availability",
  threadId: "thread-1",
}

describe("Google Gmail reconciliation", () => {
  it("normalises full Gmail API messages into the durable ingestion contract", () => {
    expect(normaliseGoogleGmailMessage(message, "inbox@example.test")).toMatchObject({
      body_text: "Please advise availability for seven nights.",
      has_attachments: true,
      provider_event_id: "gmail:message-1",
      recipient_emails: ["inbox@example.test"],
      sender_email: "alex@example.test",
      sender_name: "Alex Morgan",
      subject: "August charter enquiry",
    })
  })

  it("initialises a cursor without importing historical mail", async () => {
    const request = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "access" }), { status: 200 })
      if (url.endsWith("/profile")) return new Response(JSON.stringify({ emailAddress: "inbox@example.test", historyId: "100" }), { status: 200 })
      throw new Error(`Unexpected request: ${url}`)
    }) as typeof fetch
    const ingest = vi.fn()
    await expect(reconcileGoogleGmail({ credentials, ingest, lastHistoryId: null, request })).resolves.toEqual({
      historyId: "100", initialized: true, processed: 0, recovered: false,
    })
    expect(ingest).not.toHaveBeenCalled()
  })

  it("fetches new history messages and leaves consequential actions to ingestion", async () => {
    const request = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "access" }), { status: 200 })
      if (url.endsWith("/profile")) return new Response(JSON.stringify({ emailAddress: "inbox@example.test", historyId: "102" }), { status: 200 })
      if (url.includes("/history?")) return new Response(JSON.stringify({ history: [{ id: "102", messagesAdded: [{ message: { id: "message-1" } }] }], historyId: "102" }), { status: 200 })
      if (url.includes("/messages/message-1?")) return new Response(JSON.stringify(message), { status: 200 })
      throw new Error(`Unexpected request: ${url}`)
    }) as typeof fetch
    const ingest = vi.fn().mockResolvedValue("stored-message-id")
    await expect(reconcileGoogleGmail({ credentials, ingest, lastHistoryId: "100", request })).resolves.toEqual({
      historyId: "102", initialized: false, processed: 1, recovered: false,
    })
    expect(ingest).toHaveBeenCalledTimes(1)
  })

  it("uses a bounded recent-mail recovery when Google expires the history cursor", async () => {
    const request = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "access" }), { status: 200 })
      if (url.endsWith("/profile")) return new Response(JSON.stringify({ emailAddress: "inbox@example.test", historyId: "200" }), { status: 200 })
      if (url.includes("/history?")) return new Response("{}", { status: 404 })
      if (url.includes("/messages?") && !url.includes("message-1")) return new Response(JSON.stringify({ messages: [{ id: "message-1" }] }), { status: 200 })
      if (url.includes("/messages/message-1?")) return new Response(JSON.stringify(message), { status: 200 })
      throw new Error(`Unexpected request: ${url}`)
    }) as typeof fetch
    const ingest = vi.fn().mockResolvedValue("stored-message-id")
    await expect(reconcileGoogleGmail({ credentials, ingest, lastHistoryId: "1", request })).resolves.toEqual({
      historyId: "200", initialized: false, processed: 1, recovered: true,
    })
  })
})
