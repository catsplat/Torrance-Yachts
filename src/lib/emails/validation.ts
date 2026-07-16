import { z } from "zod"

const email = z.email().transform((value) => value.toLowerCase())

export const gmailAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().min(3).max(255),
  provider_attachment_id: z.string().trim().min(1).max(500),
  size_bytes: z.number().int().min(0).max(50 * 1024 * 1024),
})

export const gmailIngestionSchema = z.object({
  attachments: z.array(gmailAttachmentSchema).max(50).default([]),
  body_text: z.string().max(200000).default(""),
  cc_emails: z.array(email).max(100).default([]),
  gmail_label_ids: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  has_attachments: z.boolean().default(false),
  has_list_id: z.boolean().default(false),
  has_list_unsubscribe: z.boolean().default(false),
  internet_message_id: z.string().trim().max(998).default(""),
  is_bulk: z.boolean().default(false),
  provider_event_id: z.string().trim().min(1).max(500),
  provider_message_id: z.string().trim().min(1).max(500),
  provider_thread_id: z.string().trim().min(1).max(500),
  received_at: z.iso.datetime({ offset: true }),
  recipient_emails: z.array(email).min(1).max(100),
  sender_email: email,
  sender_name: z.string().trim().max(300).default(""),
  snippet: z.string().max(2000).default(""),
  subject: z.string().trim().min(1).max(998),
})

export const emailClassificationSchema = z.object({
  classification: z.enum([
    "new_enquiry",
    "enquiry_follow_up",
    "internal",
    "circular",
    "other_relevant",
  ]),
  contactId: z.union([z.literal(""), z.uuid()]).default(""),
  enquiryId: z.union([z.literal(""), z.uuid()]).default(""),
  enquirySummary: z.string().trim().max(2000).default(""),
  messageId: z.uuid(),
  reason: z.string().trim().min(2).max(2000),
}).superRefine((value, context) => {
  if (value.classification === "new_enquiry") {
    if (value.enquirySummary.length < 2) context.addIssue({ code: "custom", message: "Add an enquiry summary." })
  }
  if (value.classification === "enquiry_follow_up" && !value.enquiryId) {
    context.addIssue({ code: "custom", message: "Select the enquiry this follows up." })
  }
})

export const operationalSettingsSchema = z.object({
  enquiryTimeoutEnabled: z.enum(["on", "off"]).transform((value) => value === "on"),
  internalEmailDomains: z.string().max(2000).transform((value) =>
    value.split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean)
  ),
  negotiatingTimeoutDays: z.coerce.number().int().min(1).max(365),
  newEnquiryTimeoutDays: z.coerce.number().int().min(1).max(365),
  offerSentTimeoutDays: z.coerce.number().int().min(1).max(365),
  waitingReplyTimeoutDays: z.coerce.number().int().min(1).max(365),
})
