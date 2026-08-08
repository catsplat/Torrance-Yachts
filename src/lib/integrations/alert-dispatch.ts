import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type Delivery = Database["public"]["Tables"]["integration_deliveries"]["Row"]
type AdminClient = SupabaseClient<Database>
type FetchImplementation = typeof fetch

function applicationBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
}

function alertText(payload: Delivery["payload"]) {
  const values = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {}
  const title = typeof values.title === "string" ? values.title : "Torrance Yachts alert"
  const body = typeof values.body === "string" ? values.body : ""
  const actionUrl = typeof values.action_url === "string" ? values.action_url : ""
  return {
    body,
    link: actionUrl ? `${applicationBaseUrl()}${actionUrl}` : "",
    title,
  }
}

async function dispatchTelegram(
  delivery: Delivery,
  signal?: AbortSignal,
  request: FetchImplementation = fetch,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) throw new Error("Telegram bot delivery is not configured.")
  const payload = delivery.payload && typeof delivery.payload === "object" &&
      !Array.isArray(delivery.payload)
    ? delivery.payload
    : {}
  const recipient = payload.recipient
  if (typeof recipient !== "string" || !recipient.trim()) {
    throw new Error("Telegram recipient is missing.")
  }
  const alert = alertText(delivery.payload)
  const response = await request(
    `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: recipient,
        disable_web_page_preview: true,
        text: [alert.title, alert.body, alert.link].filter(Boolean).join("\n\n"),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: signal ?? AbortSignal.timeout(8_000),
    },
  )
  const result = await response.json() as {
    description?: string
    ok?: boolean
    result?: { message_id?: number }
  }
  if (!response.ok || !result.ok) {
    throw new Error(result.description || "Telegram rejected the alert.")
  }
  return { externalId: String(result.result?.message_id ?? ""), externalUrl: "" }
}

function encodeMimeMessage(values: {
  body: string
  from: string
  subject: string
  to: string
}) {
  const encodedSubject = Buffer.from(values.subject, "utf8").toString("base64")
  const message = [
    `From: ${values.from}`,
    `To: ${values.to}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    values.body,
  ].join("\r\n")
  return Buffer.from(message, "utf8").toString("base64url")
}

async function dispatchGmail(
  admin: AdminClient,
  delivery: Delivery,
  signal?: AbortSignal,
  request: FetchImplementation = fetch,
) {
  const { data, error } = await admin.rpc("get_delivery_oauth_credentials", {
    p_delivery_id: delivery.id,
  })
  const credentials = data?.[0]
  if (error || !credentials) {
    throw new Error("Connected Gmail OAuth credentials are unavailable.")
  }
  const tokenResponse = await request("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
    signal: signal ?? AbortSignal.timeout(8_000),
  })
  const token = await tokenResponse.json() as {
    access_token?: string
    error_description?: string
  }
  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(token.error_description || "Google rejected the OAuth refresh token.")
  }
  const payload = delivery.payload && typeof delivery.payload === "object" &&
      !Array.isArray(delivery.payload)
    ? delivery.payload
    : {}
  const recipient = payload.recipient
  if (typeof recipient !== "string" || !recipient.trim()) {
    throw new Error("Email alert recipient is missing.")
  }
  const alert = alertText(delivery.payload)
  const draftOnly = delivery.operation === "gmail_create_draft"
  const sendResponse = await request(
    draftOnly
      ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
      : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      body: JSON.stringify({
        ...(draftOnly ? {
          message: {
            raw: encodeMimeMessage({
              body: [alert.body, alert.link].filter(Boolean).join("\n\n"),
              from: credentials.account_email,
              subject: alert.title,
              to: recipient,
            }),
          },
        } : {
          raw: encodeMimeMessage({
            body: [alert.body, alert.link].filter(Boolean).join("\n\n"),
            from: credentials.account_email,
            subject: alert.title,
            to: recipient,
          }),
        }),
      }),
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: signal ?? AbortSignal.timeout(10_000),
    },
  )
  const sent = await sendResponse.json() as {
    error?: { message?: string }
    id?: string
    message?: { id?: string }
  }
  if (!sendResponse.ok || !sent.id) {
    throw new Error(sent.error?.message || "Gmail rejected the message operation.")
  }
  return {
    externalId: sent.id || sent.message?.id || "",
    externalUrl: draftOnly ? "https://mail.google.com/mail/u/0/#drafts" : "",
  }
}

export async function dispatchInternalAlert(
  admin: AdminClient,
  delivery: Delivery,
  signal?: AbortSignal,
  request: FetchImplementation = fetch,
) {
  if (delivery.operation === "telegram_send") return dispatchTelegram(delivery, signal, request)
  if (delivery.operation === "gmail_send_internal" || delivery.operation === "gmail_create_draft") {
    return dispatchGmail(admin, delivery, signal, request)
  }
  throw new Error("This delivery is not an internal staff alert.")
}

export function safeDeliveryFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal alert delivery failed."
  const normalized = message.toLowerCase()
  return {
    errorCode: normalized.includes("oauth") || normalized.includes("credentials") ? "oauth_error" : "provider_error",
    errorMessage: message.slice(0, 2000),
    retryable: !normalized.includes("credentials are unavailable"),
  }
}
