import { z } from "zod"

import { gmailIngestionSchema } from "./validation"

const rawN8nGmailMessageSchema = z.object({
  cc: z.unknown().optional(),
  date: z.union([z.string(), z.date()]),
  from: z.unknown(),
  headers: z.record(z.string(), z.unknown()).default({}),
  html: z.unknown().optional(),
  id: z.string().trim().min(1).max(480),
  labelIds: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  messageId: z.string().trim().max(998).default(""),
  subject: z.string().default(""),
  text: z.string().default(""),
  threadId: z.string().trim().min(1).max(500),
  to: z.unknown().optional(),
}).passthrough()

const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi

function emailsFrom(value: unknown) {
  const discovered: string[] = []
  const collect = (candidate: unknown) => {
    if (typeof candidate === "string") {
      discovered.push(...(candidate.match(emailPattern) ?? []))
      return
    }
    if (!candidate || typeof candidate !== "object") return
    const record = candidate as Record<string, unknown>
    if (typeof record.address === "string") collect(record.address)
    if (typeof record.text === "string") collect(record.text)
    if (Array.isArray(record.value)) record.value.forEach(collect)
  }
  collect(value)
  return [...new Set(discovered.map((email) => email.toLowerCase()))]
}

function senderName(value: unknown) {
  if (!value || typeof value !== "object") return ""
  const record = value as Record<string, unknown>
  if (Array.isArray(record.value)) {
    const first = record.value.find((entry) => entry && typeof entry === "object") as Record<string, unknown> | undefined
    if (typeof first?.name === "string") return first.name.trim().slice(0, 300)
  }
  return ""
}

function headerMap(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, headerValue]) => [
      key.toLowerCase(),
      typeof headerValue === "string" ? headerValue : "",
    ]),
  )
}

function plainTextFallback(value: unknown) {
  if (typeof value !== "string") return ""
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

export function normaliseN8nGmailMessage(input: unknown) {
  const message = rawN8nGmailMessageSchema.parse(input)
  const headers = headerMap(message.headers)
  const senderEmails = emailsFrom(message.from)
  const ccEmails = emailsFrom(message.cc)
  const recipientEmails = [
    ...emailsFrom(message.to),
    ...emailsFrom(headers["delivered-to"]),
  ]
  const receivedAt = new Date(message.date)
  if (!Number.isFinite(receivedAt.getTime())) throw new Error("Gmail message date is invalid.")
  const bodyText = (message.text.trim() || plainTextFallback(message.html)).slice(0, 200_000)
  const hasListId = Boolean(headers["list-id"])
  const hasListUnsubscribe = Boolean(headers["list-unsubscribe"])
  const precedence = headers.precedence?.toLowerCase() ?? ""

  return gmailIngestionSchema.parse({
    attachments: [],
    body_text: bodyText,
    cc_emails: ccEmails,
    gmail_label_ids: message.labelIds,
    has_attachments: (headers["content-type"] ?? "").toLowerCase().includes("multipart/mixed"),
    has_list_id: hasListId,
    has_list_unsubscribe: hasListUnsubscribe,
    internet_message_id: message.messageId,
    is_bulk: hasListId || hasListUnsubscribe || /\b(?:bulk|junk|list)\b/.test(precedence),
    provider_event_id: `gmail:${message.id}`,
    provider_message_id: message.id,
    provider_thread_id: message.threadId,
    received_at: receivedAt.toISOString(),
    recipient_emails: [...new Set(recipientEmails)],
    sender_email: senderEmails[0],
    sender_name: senderName(message.from),
    snippet: bodyText.slice(0, 2_000),
    subject: message.subject.trim() || "(No subject)",
  })
}
