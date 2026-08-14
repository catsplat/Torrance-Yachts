import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  dispatchInternalAlert,
  formatTelegramAlert,
  safeDeliveryFailure,
} from "./alert-dispatch"
import { GoogleOAuthError } from "./google-workspace"

type DeliveryFixture = Parameters<typeof dispatchInternalAlert>[1]

function delivery(overrides: Partial<DeliveryFixture>): DeliveryFixture {
  return {
    attempt_count: 0,
    claimed_at: null,
    claimed_by: null,
    credential_user_id: null,
    created_at: "2026-08-08T12:00:00.000Z",
    delivered_at: null,
    external_id: null,
    external_url: null,
    id: "10000000-0000-4000-8000-000000000001",
    idempotency_key: "synthetic-provider-contract-1",
    last_error_code: null,
    last_error_message: null,
    lease_expires_at: null,
    next_attempt_at: "2026-08-08T12:00:00.000Z",
    operation: "telegram_send",
    payload: {
      action_url: "/emails/10000000-0000-4000-8000-000000000001",
      body: "A fictional enquiry needs review.",
      recipient: "100000000",
      title: "Fictional enquiry",
    },
    provider: "telegram",
    source_id: "10000000-0000-4000-8000-000000000002",
    source_type: "notification",
    status: "claimed",
    updated_at: "2026-08-08T12:00:00.000Z",
    ...overrides,
  }
}

const unusedAdmin = {
  rpc: vi.fn(),
} as never

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("external alert provider contracts", () => {
  it("formats a Telegram alert with a secure in-app review button", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "fictional-test-token")
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      result: { message_id: 73 },
    }), { status: 200 }))

    await expect(dispatchInternalAlert(unusedAdmin, delivery({}), undefined, request)).resolves.toEqual({
      externalId: "73",
      externalUrl: "",
    })
    expect(request).toHaveBeenCalledTimes(1)
    const [url, options] = request.mock.calls[0]
    expect(String(url)).toContain("api.telegram.org/botfictional-test-token/sendMessage")
    expect(JSON.parse(String(options?.body))).toEqual({
      chat_id: "100000000",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{
          text: "Review in workspace",
          url: "http://localhost:3000/emails/10000000-0000-4000-8000-000000000001",
        }]],
      },
      text: "Fictional enquiry\n\nA fictional enquiry needs review.",
    })
  })

  it("keeps Telegram text inside the provider limit without losing the review route", () => {
    const alert = formatTelegramAlert({
      action_url: "/emails/10000000-0000-4000-8000-000000000001",
      body: "x".repeat(10_000),
      title: "Fictional enquiry",
    })

    expect(alert.text).toHaveLength(4096)
    expect(alert.text.endsWith("…")).toBe(true)
    expect(alert.reply_markup?.inline_keyboard[0][0].url).toBe(
      "http://localhost:3000/emails/10000000-0000-4000-8000-000000000001",
    )
  })

  it("creates a Gmail draft rather than sending a broker-facing email", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: [{
          account_email: "staff@example.test",
          client_id: "fictional-client-id",
          client_secret: "fictional-client-secret",
          refresh_token: "fictional-refresh-token",
        }],
        error: null,
      }),
    } as never
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fictional-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "draft-73" }), { status: 200 }))

    await expect(dispatchInternalAlert(admin, delivery({
      operation: "gmail_create_draft",
      payload: { body: "Fictional offer reply.", recipient: "broker@example.test", title: "Review fictional offer" },
      provider: "gmail",
    }), undefined, request)).resolves.toEqual({
      externalId: "draft-73",
      externalUrl: "https://mail.google.com/mail/u/0/#drafts",
    })
    expect(request).toHaveBeenCalledTimes(2)
    expect(String(request.mock.calls[1][0])).toBe("https://gmail.googleapis.com/gmail/v1/users/me/drafts")
    expect(String(request.mock.calls[1][0])).not.toContain("messages/send")
    const raw = JSON.parse(String(request.mock.calls[1][1]?.body)).message.raw as string
    const mime = Buffer.from(raw, "base64url").toString("utf8")
    expect(mime).toContain("To: broker@example.test")
    expect(mime).toContain("Fictional offer reply.")
  })

  it("marks Gmail messages read through the application-owned OAuth adapter", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: [{ account_email: "staff@example.test", client_id: "client", client_secret: "secret", refresh_token: "refresh" }], error: null }) } as never
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "gmail-message-73" }), { status: 200 }))
    await expect(dispatchInternalAlert(admin, delivery({
      operation: "gmail_mark_read", payload: { provider_message_id: "gmail-message-73" }, provider: "gmail",
    }), undefined, request)).resolves.toEqual({ externalId: "gmail-message-73", externalUrl: "" })
    expect(String(request.mock.calls[1][0])).toContain("/messages/gmail-message-73/modify")
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toEqual({ removeLabelIds: ["UNREAD"] })
  })

  it("keeps unavailable OAuth credentials visible and non-retryable", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) } as never
    await expect(dispatchInternalAlert(admin, delivery({ operation: "gmail_create_draft", provider: "gmail" }))).rejects.toThrow(
      "Connected Gmail OAuth credentials are unavailable.",
    )
    expect(safeDeliveryFailure(new Error("Connected Gmail OAuth credentials are unavailable."))).toEqual({
      errorCode: "oauth_error",
      errorMessage: "Connected Gmail OAuth credentials are unavailable.",
      retryable: false,
    })
  })

  it("marks revoked Google grants as reconnect-required and non-retryable", () => {
    expect(safeDeliveryFailure(new GoogleOAuthError("Reconnect Google Workspace.", true))).toEqual({
      errorCode: "oauth_error",
      errorMessage: "Reconnect Google Workspace.",
      requiresReauthentication: true,
      retryable: false,
    })
  })
})
