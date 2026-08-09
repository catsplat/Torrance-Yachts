import { z } from "zod"

import { displayNameFromAddressHeader, emailAddressesFrom, plainTextFromHtml } from "./message-content"
import { gmailIngestionSchema } from "./validation"
import { refreshGoogleAccessToken, type GoogleWorkspaceCredentials } from "../integrations/google-workspace"

type FetchImplementation = typeof fetch

type GmailPart = {
  body?: { attachmentId?: string; data?: string; size?: number }
  filename?: string
  headers?: Array<{ name: string; value: string }>
  mimeType?: string
  parts?: GmailPart[]
}

const gmailPartSchema: z.ZodType<GmailPart> = z.lazy(() => z.object({
  body: z.object({
    attachmentId: z.string().optional(),
    data: z.string().optional(),
    size: z.number().int().nonnegative().optional(),
  }).optional(),
  filename: z.string().default(""),
  headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
  mimeType: z.string().default("application/octet-stream"),
  parts: z.array(gmailPartSchema).default([]),
}))

const gmailMessageSchema = z.object({
  historyId: z.string().regex(/^[0-9]+$/).optional(),
  id: z.string().min(1).max(500),
  internalDate: z.string().regex(/^[0-9]+$/),
  labelIds: z.array(z.string()).default([]),
  payload: gmailPartSchema,
  snippet: z.string().default(""),
  threadId: z.string().min(1).max(500),
})

const profileSchema = z.object({
  emailAddress: z.email(),
  historyId: z.string().regex(/^[0-9]+$/),
})

const historySchema = z.object({
  history: z.array(z.object({
    id: z.string().regex(/^[0-9]+$/),
    messagesAdded: z.array(z.object({
      message: z.object({ id: z.string().min(1), threadId: z.string().optional() }),
    })).default([]),
  })).default([]),
  historyId: z.string().regex(/^[0-9]+$/),
  nextPageToken: z.string().optional(),
})

const messageListSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1), threadId: z.string().optional() })).default([]),
  nextPageToken: z.string().optional(),
})

function headerMap(part: GmailPart) {
  return Object.fromEntries((part.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]))
}

function decodeBody(data: string | undefined) {
  if (!data) return ""
  try {
    return Buffer.from(data, "base64url").toString("utf8")
  } catch {
    return ""
  }
}

function collectParts(part: GmailPart): GmailPart[] {
  return [part, ...(part.parts ?? []).flatMap(collectParts)]
}

export function normaliseGoogleGmailMessage(input: unknown, accountEmail: string) {
  const message = gmailMessageSchema.parse(input)
  const headers = headerMap(message.payload)
  const parts = collectParts(message.payload)
  const plainBodies = parts
    .filter((part) => part.mimeType?.toLowerCase().startsWith("text/plain"))
    .map((part) => decodeBody(part.body?.data).trim())
    .filter(Boolean)
  const htmlBodies = parts
    .filter((part) => part.mimeType?.toLowerCase().startsWith("text/html"))
    .map((part) => plainTextFromHtml(decodeBody(part.body?.data)))
    .filter(Boolean)
  const bodyText = (plainBodies.join("\n\n") || htmlBodies.join("\n\n")).slice(0, 200_000)
  const attachments = parts.flatMap((part) => {
    const filename = part.filename?.trim() ?? ""
    const attachmentId = part.body?.attachmentId?.trim() ?? ""
    if (!filename || !attachmentId) return []
    return [{
      filename: filename.slice(0, 255),
      mime_type: (part.mimeType || "application/octet-stream").slice(0, 255),
      provider_attachment_id: attachmentId.slice(0, 500),
      size_bytes: Math.min(part.body?.size ?? 0, 50 * 1024 * 1024),
    }]
  })
  const senderHeader = headers.from ?? ""
  const senderEmails = emailAddressesFrom(senderHeader)
  const recipientEmails = [...new Set([
    ...emailAddressesFrom(headers.to),
    ...emailAddressesFrom(headers["delivered-to"]),
    accountEmail.toLowerCase(),
  ])]
  const ccEmails = emailAddressesFrom(headers.cc)
  const receivedAt = new Date(Number(message.internalDate))
  if (!Number.isFinite(receivedAt.getTime())) throw new Error("Gmail message date is invalid.")
  const hasListId = Boolean(headers["list-id"])
  const hasListUnsubscribe = Boolean(headers["list-unsubscribe"])
  const precedence = headers.precedence?.toLowerCase() ?? ""
  const snippet = (bodyText || message.snippet).slice(0, 2_000)

  return gmailIngestionSchema.parse({
    attachments,
    body_text: bodyText,
    cc_emails: ccEmails,
    gmail_label_ids: message.labelIds,
    has_attachments: attachments.length > 0,
    has_list_id: hasListId,
    has_list_unsubscribe: hasListUnsubscribe,
    internet_message_id: (headers["message-id"] ?? "").slice(0, 998),
    is_bulk: hasListId || hasListUnsubscribe || /\b(?:bulk|junk|list)\b/.test(precedence),
    provider_event_id: `gmail:${message.id}`,
    provider_message_id: message.id,
    provider_thread_id: message.threadId,
    received_at: receivedAt.toISOString(),
    recipient_emails: recipientEmails,
    sender_email: senderEmails[0],
    sender_name: displayNameFromAddressHeader(senderHeader),
    snippet,
    subject: (headers.subject ?? "").trim().slice(0, 998) || "(No subject)",
  })
}

async function getJson<T>(
  url: URL | string,
  schema: z.ZodType<T>,
  accessToken: string,
  request: FetchImplementation,
) {
  const response = await request(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8_000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(response.status === 404 ? "Gmail history cursor expired." : "Gmail request failed.")
    Object.assign(error, { status: response.status })
    throw error
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new Error("Gmail returned an invalid response.")
  return parsed.data
}

async function fetchFullMessage(id: string, accessToken: string, request: FetchImplementation) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`)
  url.searchParams.set("format", "full")
  return getJson(url, gmailMessageSchema, accessToken, request)
}

async function fallbackRecentMessageIds(accessToken: string, request: FetchImplementation) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
  url.searchParams.set("maxResults", "100")
  url.searchParams.set("q", "in:inbox newer_than:7d")
  const result = await getJson(url, messageListSchema, accessToken, request)
  if (result.nextPageToken) throw new Error("Gmail recovery backlog exceeds the safe batch size.")
  return result.messages.map((message) => message.id)
}

export async function reconcileGoogleGmail({
  credentials,
  ingest,
  lastHistoryId,
  request = fetch,
}: {
  credentials: GoogleWorkspaceCredentials
  ingest: (message: ReturnType<typeof normaliseGoogleGmailMessage>) => Promise<unknown>
  lastHistoryId: string | null
  request?: FetchImplementation
}) {
  const accessToken = await refreshGoogleAccessToken(credentials, request)
  const profile = await getJson(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    profileSchema,
    accessToken,
    request,
  )
  if (!lastHistoryId) {
    return { historyId: profile.historyId, initialized: true, processed: 0, recovered: false }
  }

  let messageIds: string[] = []
  let nextHistoryId = profile.historyId
  let recovered = false
  try {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history")
    url.searchParams.set("historyTypes", "messageAdded")
    url.searchParams.set("labelId", "INBOX")
    url.searchParams.set("maxResults", "100")
    url.searchParams.set("startHistoryId", lastHistoryId)
    const history = await getJson(url, historySchema, accessToken, request)
    const selectedIds = new Set<string>()
    for (const record of history.history) {
      record.messagesAdded.forEach(({ message }) => selectedIds.add(message.id))
      nextHistoryId = record.id
      if (selectedIds.size >= 25) break
    }
    if (selectedIds.size === 0 && !history.nextPageToken) nextHistoryId = history.historyId
    messageIds = [...selectedIds]
  } catch (error) {
    if (!(error instanceof Error) || !Object.hasOwn(error, "status") || (error as Error & { status?: number }).status !== 404) throw error
    messageIds = await fallbackRecentMessageIds(accessToken, request)
    nextHistoryId = profile.historyId
    recovered = true
  }

  for (let index = 0; index < messageIds.length; index += 4) {
    const messages = await Promise.all(
      messageIds.slice(index, index + 4).map((id) => fetchFullMessage(id, accessToken, request)),
    )
    for (const message of messages) {
      await ingest(normaliseGoogleGmailMessage(message, profile.emailAddress))
    }
  }

  return { historyId: nextHistoryId, initialized: false, processed: messageIds.length, recovered }
}
