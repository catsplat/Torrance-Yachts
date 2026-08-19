import { displayNameFromAddressHeader, emailAddressesFrom, plainTextFromHtml } from "./message-content"
import { gmailIngestionSchema } from "./validation"

type HeaderMap = Record<string, string>

function headersFromSource(source: Buffer) {
  const head = source.toString("utf8", 0, Math.min(source.length, 256_000)).split(/\r?\n\r?\n/, 1)[0] ?? ""
  const unfolded = head.replace(/\r?\n[ \t]+/g, " ")
  return unfolded.split(/\r?\n/).reduce<HeaderMap>((headers, line) => {
    const separator = line.indexOf(":")
    if (separator > 0) headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim()
    return headers
  }, {})
}

function bodyFromSource(source: Buffer) {
  const raw = source.toString("utf8", 0, Math.min(source.length, 256_000))
  const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n\n")
  return (/<[a-z][\s\S]*>/i.test(body) ? plainTextFromHtml(body) : body.replace(/\r/g, "").trim()).slice(0, 200_000)
}

export function normaliseImapMessage(input: {
  accountEmail: string
  connectionId: string
  flags: Set<string>
  folder: string
  internalDate: Date
  source: Buffer
  uid: number
  uidValidity: string
}) {
  const headers = headersFromSource(input.source)
  const senderHeader = headers.from ?? ""
  const senderEmails = emailAddressesFrom(senderHeader)
  const recipientEmails = [...new Set([...emailAddressesFrom(headers.to), input.accountEmail.toLowerCase()])]
  const ccEmails = emailAddressesFrom(headers.cc)
  const bodyText = bodyFromSource(input.source)
  const messageId = (headers["message-id"] ?? `imap-${input.uid}`).slice(0, 500)
  const threadId = (headers.references?.trim().split(/\s+/).at(-1) ?? headers["in-reply-to"] ?? messageId).slice(0, 500)
  const precedence = headers.precedence?.toLowerCase() ?? ""
  const hasListId = Boolean(headers["list-id"])
  const hasListUnsubscribe = Boolean(headers["list-unsubscribe"])
  return gmailIngestionSchema.parse({
    attachments: [], body_text: bodyText, cc_emails: ccEmails,
    gmail_label_ids: [input.folder, ...input.flags].slice(0, 100),
    has_attachments: /content-disposition:\s*attachment/i.test(input.source.toString("utf8", 0, 64_000)),
    has_list_id: hasListId, has_list_unsubscribe: hasListUnsubscribe, internet_message_id: messageId,
    is_bulk: hasListId || hasListUnsubscribe || /\b(?:bulk|junk|list)\b/.test(precedence),
    provider_event_id: `${input.connectionId}:${input.uidValidity}:${input.uid}`,
    provider_message_id: `${input.uidValidity}:${input.uid}`, provider_thread_id: threadId,
    received_at: input.internalDate.toISOString(), recipient_emails: recipientEmails,
    sender_email: senderEmails[0] ?? input.accountEmail.toLowerCase(), sender_name: displayNameFromAddressHeader(senderHeader),
    snippet: bodyText.slice(0, 2_000), subject: (headers.subject ?? "(No subject)").slice(0, 998),
  })
}
