"use server"

import { createHash, randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateNextPendingEmailSuggestion } from "@/lib/ai/service"
import { getInvoiceGenerationContext } from "@/lib/integrations/data"
import { generateInvoicePdf } from "@/lib/integrations/invoice"
import { listGoogleDriveFolders, safeGoogleConnectionMessage } from "@/lib/integrations/google-workspace"
import { getActiveGoogleWorkspaceDispatchCredentials } from "@/lib/integrations/google-workspace-server"
import {
  connectionSettingsSchema,
  deliveryRetrySchema,
  driveSyncSchema,
  invoiceGenerationSchema,
  invoiceProfileApprovalSchema,
  invoiceProfileSchema,
  notificationReviewSchema,
  notificationDraftSchema,
} from "@/lib/integrations/validation"

export type IntegrationActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const initialError = { message: "Your session has expired. Sign in again." }
function validationState(error: z.ZodError): IntegrationActionState {
  return { fieldErrors: error.flatten().fieldErrors, message: "Review the highlighted fields." }
}
async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? initialError
}
function refreshIntegrations() {
  revalidatePath("/")
  revalidatePath("/calendar")
  revalidatePath("/integrations")
  revalidatePath("/settings")
}

export async function updateConnectionAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = connectionSettingsSchema.safeParse({
    configurationNotes: formData.get("configurationNotes"),
    enabled: Boolean(formData.get("enabled")),
    provider: formData.get("provider"),
    targetReference: formData.get("targetReference"),
  })
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_integration_connection", {
    p_configuration_notes: parsed.data.configurationNotes,
    p_enabled: parsed.data.enabled,
    p_provider: parsed.data.provider,
    p_target_reference: parsed.data.targetReference,
  })
  if (error) return { message: "Only an administrator can update integration settings." }
  refreshIntegrations()
  return { message: "Integration metadata updated. No credential was stored in the database.", success: true }
}

const gmailIngestionSchema = z.object({
  enabled: z.boolean(),
  userId: z.union([z.literal(""), z.uuid()]),
})

export async function configureGmailIngestionAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = gmailIngestionSchema.safeParse({
    enabled: Boolean(formData.get("enabled")),
    userId: formData.get("userId") ?? "",
  })
  if (!parsed.success || (parsed.data.enabled && !parsed.data.userId)) {
    return { message: "Choose the inbox to monitor." }
  }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("configure_gmail_ingestion", {
    p_enabled: parsed.data.enabled,
    p_user_id: parsed.data.userId || context.userId,
  })
  if (error) return { message: "The Gmail inbox could not be updated." }
  refreshIntegrations()
  return { message: parsed.data.enabled ? "Incoming Gmail enabled." : "Incoming Gmail paused.", success: true }
}

const googleWorkspaceDispatchSchema = z.object({
  enabled: z.boolean(),
  userId: z.union([z.literal(""), z.uuid()]),
})

export async function configureGoogleWorkspaceDispatchAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = googleWorkspaceDispatchSchema.safeParse({
    enabled: Boolean(formData.get("enabled")),
    userId: formData.get("userId") ?? "",
  })
  if (!parsed.success || (parsed.data.enabled && !parsed.data.userId)) {
    return { message: "Choose a connected Google account." }
  }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("configure_google_workspace_dispatch", {
    p_enabled: parsed.data.enabled,
    p_user_id: parsed.data.userId || context.userId,
  })
  if (error) {
    return { message: "Reconnect Google Workspace to approve Calendar, Drive and Sheets access." }
  }
  refreshIntegrations()
  return {
    message: parsed.data.enabled ? "Google Workspace delivery enabled." : "Google Workspace delivery paused.",
    success: true,
  }
}

const googleDriveFolderSchema = z.object({
  folderId: z.string().trim().min(1).max(500),
  folderName: z.string().trim().min(1).max(500),
})

export async function selectGoogleDriveFolderAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = googleDriveFolderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Choose a Drive folder." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  if (context.role !== "administrator") return { message: "Administrator access is required." }
  try {
    const credentials = await getActiveGoogleWorkspaceDispatchCredentials()
    const folders = await listGoogleDriveFolders(credentials)
    const selected = folders.find((folder) => folder.id === parsed.data.folderId)
    if (!selected || selected.name !== parsed.data.folderName) {
      return { message: "That folder is no longer available. Refresh the list." }
    }
    const { error } = await context.supabase.rpc("update_integration_connection", {
      p_configuration_notes: `Selected folder: ${selected.name}`,
      p_enabled: true,
      p_provider: "google_drive",
      p_target_reference: selected.id,
    })
    if (error) return { message: "The Drive folder could not be saved." }
  } catch (error) {
    return { message: safeGoogleConnectionMessage(error, "Google Drive folders could not be loaded.") }
  }
  refreshIntegrations()
  return { message: "Drive folder selected.", success: true }
}

export async function reviewNotificationAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = notificationReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("review_notification", {
    p_approved: parsed.data.approved,
    p_notification_id: parsed.data.notificationId,
    p_reason: parsed.data.approved ? "Notification approved" : parsed.data.reason,
  })
  if (error) {
    return { message: "The notification could not be reviewed. Check recipient and integration configuration." }
  }
  refreshIntegrations()
  return {
    message: parsed.data.approved ? "Notification approved and queued." : "Notification cancelled.",
    success: true,
  }
}

export async function createNotificationDraftAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = notificationDraftSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const separator = parsed.data.recipient.indexOf(":")
  const recipientType = parsed.data.recipient.slice(0, separator)
  const recipientId = parsed.data.recipient.slice(separator + 1)
  const emptyRecipient = null as unknown as string
  const { error } = await context.supabase.rpc("create_notification", {
    p_action_url: parsed.data.actionUrl,
    p_body: parsed.data.body,
    p_channel: parsed.data.channel,
    p_idempotency_key: `manual:${parsed.data.notificationType}:${randomUUID()}`,
    p_notification_type: parsed.data.notificationType,
    p_priority: parsed.data.priority,
    p_recipient_contact_id: recipientType === "contact" ? recipientId : emptyRecipient,
    p_recipient_user_id: recipientType === "user" ? recipientId : emptyRecipient,
    p_requires_approval: parsed.data.channel !== "in_app",
    p_source_id: parsed.data.sourceId,
    p_source_type: parsed.data.sourceType,
    p_title: parsed.data.title,
  })
  if (error) return { message: "The notification draft could not be created." }
  refreshIntegrations()
  return { message: "Notification draft created for review.", success: true }
}

export async function retryDeliveryAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = deliveryRetrySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("retry_integration_delivery", {
    p_delivery_id: parsed.data.deliveryId,
    p_reason: "Delivery retry requested",
  })
  if (error) return { message: "Only an administrator can retry a failed delivery." }
  refreshIntegrations()
  return { message: "Delivery returned to the retry queue.", success: true }
}

export async function queueSheetSnapshotAction(
  _state: IntegrationActionState,
): Promise<IntegrationActionState> {
  void _state
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("queue_operations_sheet_snapshot")
  if (error) return { message: "Enable Google Sheets and use an administrator account." }
  refreshIntegrations()
  return { message: "One-way operational workbook snapshot queued.", success: true }
}

export async function runAutomationNowAction(
  _state: IntegrationActionState,
): Promise<IntegrationActionState> {
  void _state
  const context = await contextOrMessage()
  if ("message" in context) return context
  if (context.role !== "administrator") return { message: "Administrator access is required." }
  try {
    await generateNextPendingEmailSuggestion()
    const admin = createAdminClient()
    const { data, error } = await admin.rpc("run_automation_tick", {
      p_as_of: new Date().toISOString(),
    })
    if (error) return { message: "The automation tick failed." }
    refreshIntegrations()
    const result = data as {
      calendar_records_refreshed?: number
      email_actions_queued?: number
      notifications_created?: number
    } | null
    return {
      message: `Automation refreshed ${result?.calendar_records_refreshed ?? 0} calendar records, created ${result?.notifications_created ?? 0} notifications, and queued ${result?.email_actions_queued ?? 0} Gmail actions.`,
      success: true,
    }
  } catch {
    return { message: "The trusted automation client is not configured." }
  }
}

export async function queueDriveSyncAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = driveSyncSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("queue_document_drive_sync", {
    p_document_id: parsed.data.documentId,
    p_reason: "Verified document queued for Drive copy",
  })
  if (error) return { message: "Only verified documents can be queued after Drive is enabled." }
  revalidatePath(`/bookings/${parsed.data.bookingId}/documents`)
  revalidatePath("/integrations")
  return { message: "Controlled Google Drive copy queued.", success: true }
}

export async function createInvoiceProfileAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = invoiceProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("create_invoice_profile_draft", {
    p_issuer_address: parsed.data.issuerAddress,
    p_issuer_name: parsed.data.issuerName,
    p_payment_instructions: parsed.data.paymentInstructions,
    p_profile_name: parsed.data.profileName,
    p_recipient_address: parsed.data.recipientAddress,
    p_recipient_email: parsed.data.recipientEmail,
    p_recipient_name: parsed.data.recipientName,
    p_service_description_template: parsed.data.serviceDescriptionTemplate,
  })
  if (error) return { message: "Only an administrator can create invoice profiles." }
  revalidatePath("/settings/invoices")
  return { message: "Invoice profile draft created. Approve it before generation.", success: true }
}

export async function approveInvoiceProfileAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = invoiceProfileApprovalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("approve_invoice_profile", {
    p_profile_id: parsed.data.profileId,
    p_reason: "Invoice profile reviewed and approved",
  })
  if (error) return { message: "Only a draft invoice profile can be approved by an administrator." }
  revalidatePath("/settings/invoices")
  return { message: "Invoice profile approved; the previous approved version was retired.", success: true }
}

export async function generateInvoiceAction(
  _state: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const parsed = invoiceGenerationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const existing = await context.supabase.from("generated_invoices").select("id")
    .eq("booking_id", parsed.data.bookingId).maybeSingle()
  if (existing.data) return { message: "An invoice has already been generated for this booking calculation." }

  let source
  try {
    source = await getInvoiceGenerationContext(parsed.data.bookingId, parsed.data.invoiceProfileId)
  } catch {
    return { message: "Approved invoice and commission source data are required." }
  }
  const bytes = await generateInvoicePdf({
    amount: Number(source.commission.amount),
    currency: source.commission.currency,
    invoiceNumber: parsed.data.invoiceNumber,
    issueDate: parsed.data.issueDate,
    issuerAddress: source.profile.issuer_address,
    issuerName: source.profile.issuer_name,
    paymentInstructions: source.profile.payment_instructions,
    recipientAddress: source.profile.recipient_address,
    recipientName: source.profile.recipient_name,
    serviceDescription: parsed.data.serviceDescription,
  })
  const fileId = randomUUID()
  const storagePath = `${parsed.data.bookingId}/${fileId}/${fileId}.pdf`
  const filename = `${parsed.data.invoiceNumber.replaceAll("/", "-")}.pdf`
  const pdfBuffer = Uint8Array.from(bytes).buffer
  const { error: uploadError } = await context.supabase.storage.from("booking-private")
    .upload(storagePath, new Blob([pdfBuffer], { type: "application/pdf" }), {
      cacheControl: "private, max-age=0",
      contentType: "application/pdf",
      upsert: false,
    })
  if (uploadError) return { message: "Invoice PDF generation succeeded but private upload failed." }

  const { data: documentId, error: documentError } = await createAdminClient().rpc(
    "register_trusted_generated_document",
    {
      p_booking_id: parsed.data.bookingId,
      p_document_type: "kylian_commission_invoice",
      p_title: `Commission invoice ${parsed.data.invoiceNumber}`,
      p_original_filename: filename,
      p_storage_path: storagePath,
      p_mime_type: "application/pdf",
      p_size_bytes: bytes.byteLength,
      p_retention_class: "financial_record",
      p_content_sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
      p_created_by: context.userId,
    },
  )
  if (documentError || !documentId) {
    await context.supabase.storage.from("booking-private").remove([storagePath])
    return { message: "The invoice document record was rejected; the file was removed." }
  }
  const { error } = await context.supabase.rpc("register_generated_invoice", {
    p_booking_id: parsed.data.bookingId,
    p_commission_calculation_id: source.commission.id,
    p_document_id: documentId,
    p_invoice_number: parsed.data.invoiceNumber,
    p_invoice_profile_id: parsed.data.invoiceProfileId,
    p_issue_date: parsed.data.issueDate,
    p_service_description: parsed.data.serviceDescription,
  })
  if (error) {
    return { message: "The private PDF exists but its generated-invoice audit record needs review." }
  }
  revalidatePath(`/bookings/${parsed.data.bookingId}/documents`)
  revalidatePath("/documents")
  return { message: "Deterministic commission invoice generated privately for review.", success: true }
}
