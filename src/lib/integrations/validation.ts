import { z } from "zod"

const uuid = z.uuid()
const boundedText = (maximum: number) => z.string().trim().min(2).max(maximum)

export const integrationProviderSchema = z.enum([
  "telegram",
  "gmail",
  "google_calendar",
  "google_drive",
  "google_sheets",
])

export const connectionSettingsSchema = z.object({
  configurationNotes: z.string().trim().max(2000),
  enabled: z.boolean(),
  provider: integrationProviderSchema,
  targetReference: z.string().trim().max(500),
})

export const notificationReviewSchema = z.object({
  approved: z.enum(["true", "false"]).transform((value) => value === "true"),
  notificationId: uuid,
  reason: boundedText(2000),
})

export const notificationDraftSchema = z.object({
  actionUrl: z.union([z.literal(""), z.string().trim().regex(/^\/[A-Za-z0-9/_?=&.-]+$/).max(1001)]),
  body: boundedText(30000),
  channel: z.enum(["in_app", "telegram", "email_alert", "email_draft"]),
  notificationType: z.string().trim().regex(/^[a-z][a-z0-9_]{1,79}$/),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  recipient: z.string().regex(/^(user|contact):[0-9a-f-]{36}$/),
  sourceId: uuid,
  sourceType: z.string().trim().regex(/^[a-z][a-z0-9_]{1,79}$/),
  title: boundedText(240),
})

export const deliveryRetrySchema = z.object({
  deliveryId: uuid,
  reason: boundedText(2000),
})

export const driveSyncSchema = z.object({
  bookingId: uuid,
  documentId: uuid,
  reason: boundedText(2000),
})

export const invoiceProfileSchema = z.object({
  issuerAddress: boundedText(2000),
  issuerName: boundedText(200),
  paymentInstructions: boundedText(5000),
  profileName: boundedText(120),
  recipientAddress: boundedText(2000),
  recipientEmail: z.union([z.literal(""), z.email()]),
  recipientName: boundedText(200),
  serviceDescriptionTemplate: boundedText(1000),
})

export const invoiceProfileApprovalSchema = z.object({
  profileId: uuid,
  reason: boundedText(2000),
})

export const invoiceGenerationSchema = z.object({
  bookingId: uuid,
  invoiceNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9./_-]{2,79}$/),
  invoiceProfileId: uuid,
  issueDate: z.iso.date(),
  serviceDescription: boundedText(1000),
})

export const deliveryClaimSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  workerId: z.string().trim().min(2).max(160),
})

export const deliveryCompletionSchema = z.object({
  externalId: z.string().trim().max(1000).default(""),
  externalUrl: z.union([z.literal(""), z.url().max(2000)]).default(""),
  workerId: z.string().trim().min(2).max(160),
})

export const deliveryFailureSchema = z.object({
  errorCode: z.string().trim().min(1).max(120),
  errorMessage: z.string().trim().min(2).max(2000),
  retryable: z.boolean(),
  workerId: z.string().trim().min(2).max(160),
})
