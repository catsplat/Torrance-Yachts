import { randomUUID } from "node:crypto"

import { gmailIngestionSchema } from "../emails/validation"

export const offlineEmailKinds = [
  "new_enquiry",
  "enquiry_follow_up",
  "internal",
  "circular",
  "unknown",
] as const

export type OfflineEmailKind = typeof offlineEmailKinds[number]

type FixtureOptions = {
  internalDomain?: string
  runId?: string
  threadId?: string
}

export function offlineRehearsalEnabled() {
  return process.env.APP_ENVIRONMENT === "development"
}

export function createOfflineRehearsalRunId() {
  return randomUUID()
}

export function createOfflineRehearsalEmail(
  kind: OfflineEmailKind = "new_enquiry",
  options: FixtureOptions = {},
) {
  const suffix = options.runId ?? randomUUID()
  const receivedAt = new Date().toISOString()
  const common = {
    attachments: [],
    cc_emails: [],
    has_attachments: false,
    internet_message_id: `<offline-rehearsal-${kind}-${suffix}@example.test>`,
    provider_event_id: `offline-rehearsal:${kind}:${suffix}`,
    provider_message_id: `offline-rehearsal-${kind}-${suffix}`,
    received_at: receivedAt,
    recipient_emails: ["operations@example.test"],
  }
  const threadId = options.threadId ?? `offline-rehearsal-thread-${suffix}`

  if (kind === "enquiry_follow_up") {
    return gmailIngestionSchema.parse({
      ...common,
      body_text: "Dear Torrance Yachts team,\n\nFollowing up on my earlier M/Y Asteria enquiry. Please let me know whether you need any further information.\n\nKind regards,\nAlex Morgan",
      gmail_label_ids: ["INBOX", "OFFLINE_REHEARSAL"],
      has_list_id: false,
      has_list_unsubscribe: false,
      is_bulk: false,
      provider_thread_id: threadId,
      sender_email: "alex.morgan@example.test",
      sender_name: "Alex Morgan",
      snippet: "Synthetic follow-up to the fictional Asteria enquiry.",
      subject: "Re: Offline rehearsal: August family charter enquiry",
    })
  }
  if (kind === "internal") {
    const internalDomain = options.internalDomain ?? "example.test"
    return gmailIngestionSchema.parse({
      ...common,
      body_text: "Please review the fictional crew logistics note before the rehearsal booking is confirmed.",
      gmail_label_ids: ["INBOX", "OFFLINE_REHEARSAL"],
      has_list_id: false,
      has_list_unsubscribe: false,
      is_bulk: false,
      provider_thread_id: threadId,
      sender_email: `operations@${internalDomain}`,
      sender_name: "Synthetic Operations",
      snippet: "Synthetic internal logistics note.",
      subject: "Offline rehearsal: crew logistics note",
    })
  }
  if (kind === "circular") {
    return gmailIngestionSchema.parse({
      ...common,
      body_text: "Synthetic newsletter. Unsubscribe from this fictional mailing list.",
      gmail_label_ids: ["INBOX", "OFFLINE_REHEARSAL"],
      has_list_id: true,
      has_list_unsubscribe: true,
      is_bulk: true,
      provider_thread_id: threadId,
      sender_email: "newsletter@example.test",
      sender_name: "Synthetic Charter News",
      snippet: "Synthetic circular used to verify archive and mark-read routing.",
      subject: "Offline rehearsal: weekly charter news",
    })
  }
  if (kind === "unknown") {
    return gmailIngestionSchema.parse({
      ...common,
      body_text: "Please see the attached fictional note regarding a matter requiring manual review.",
      gmail_label_ids: ["INBOX", "OFFLINE_REHEARSAL"],
      has_list_id: false,
      has_list_unsubscribe: false,
      is_bulk: false,
      provider_thread_id: threadId,
      sender_email: "unknown.sender@example.test",
      sender_name: "Unidentified sender",
      snippet: "Synthetic unknown message for manual review.",
      subject: "Offline rehearsal: action requested",
    })
  }
  return gmailIngestionSchema.parse({
    ...common,
    body_text: [
      "Dear Torrance Yachts team,",
      "",
      "We are looking for a seven-night family charter aboard M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026.",
      "Athens to Athens would be ideal. Our indicative budget is EUR 180,000 before applicable tax.",
      "Please advise the relevant rate and whether the yacht may be available.",
      "",
      "Kind regards,",
      "Alex Morgan",
      "Example Charter Partners",
    ].join("\n"),
    gmail_label_ids: ["INBOX", "OFFLINE_REHEARSAL"],
    has_attachments: false,
    has_list_id: false,
    has_list_unsubscribe: false,
    is_bulk: false,
    provider_thread_id: threadId,
    sender_email: "alex.morgan@example.test",
    sender_name: "Alex Morgan",
    snippet: "Synthetic seven-night family charter enquiry for M/Y Asteria.",
    subject: "Offline rehearsal: August family charter enquiry",
  })
}
