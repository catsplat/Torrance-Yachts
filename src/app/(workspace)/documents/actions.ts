"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  contractApprovalSchema,
  contractReviewSchema,
  documentMetadataSchema,
  documentReviewSchema,
  paymentPaidSchema,
  requirementWaiverSchema,
  validateDocumentFile,
} from "@/lib/documents/validation"

export type DocumentActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

function validationState(error: z.ZodError): DocumentActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Review the highlighted fields.",
  }
}

async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? { message: "Your session has expired. Sign in again." }
}

function refreshBookingDocuments(bookingId: string) {
  revalidatePath("/")
  revalidatePath("/documents")
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/bookings/${bookingId}/documents`)
  revalidatePath(`/bookings/${bookingId}/tasks`)
  revalidatePath("/tasks")
}

export async function uploadBookingDocumentAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = documentMetadataSchema.safeParse({
    bookingId: formData.get("bookingId"),
    documentType: formData.get("documentType"),
    retentionClass: formData.get("retentionClass"),
    title: formData.get("title"),
  })
  if (!parsed.success) return validationState(parsed.error)
  const fileResult = validateDocumentFile(formData.get("file"))
  if ("error" in fileResult) return { message: fileResult.error }
  const context = await contextOrMessage()
  if ("message" in context) return context

  const extension = fileResult.file.type === "application/pdf"
    ? "pdf"
    : fileResult.file.type === "image/png" ? "png" : "jpg"
  const documentId = randomUUID()
  const storagePath =
    `${parsed.data.bookingId}/${documentId}/${documentId}.${extension}`
  const { error: uploadError } = await context.supabase.storage
    .from("booking-private")
    .upload(storagePath, fileResult.file, {
      cacheControl: "private, max-age=0",
      contentType: fileResult.file.type,
      upsert: false,
    })
  if (uploadError) {
    return { message: "The private file upload failed. Nothing was recorded." }
  }

  const { error } = await context.supabase.rpc("register_booking_document", {
    p_booking_id: parsed.data.bookingId,
    p_document_type: parsed.data.documentType,
    p_title: parsed.data.title,
    p_original_filename: fileResult.file.name,
    p_storage_path: storagePath,
    p_mime_type: fileResult.file.type,
    p_size_bytes: fileResult.file.size,
    p_retention_class: parsed.data.retentionClass,
  })
  if (error) {
    await context.supabase.storage.from("booking-private").remove([storagePath])
    return { message: "The document record was rejected; the uploaded file was removed." }
  }
  refreshBookingDocuments(parsed.data.bookingId)
  return { message: "Private document uploaded for human verification.", success: true }
}

export async function reviewBookingDocumentAction(
  bookingId: string,
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = documentReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("review_booking_document", {
    p_document_id: parsed.data.documentId,
    p_approved: parsed.data.approved,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "The document could not be reviewed." }
  refreshBookingDocuments(bookingId)
  return {
    message: parsed.data.approved ? "Document verified." : "Document rejected for replacement.",
    success: true,
  }
}

export async function waiveRequirementAction(
  bookingId: string,
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = requirementWaiverSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("waive_booking_document_requirement", {
    p_requirement_id: parsed.data.requirementId,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "Only an administrator can waive an optional requirement." }
  refreshBookingDocuments(bookingId)
  return { message: "Optional requirement waived with a recorded reason.", success: true }
}

export async function saveContractReviewAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = contractReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("save_contract_review", {
    p_booking_id: parsed.data.bookingId,
    p_source_document_id: parsed.data.sourceDocumentId,
    p_charter_start_date: parsed.data.charterStartDate,
    p_charter_end_date: parsed.data.charterEndDate,
    p_embarkation_port: parsed.data.embarkationPort,
    p_disembarkation_port: parsed.data.disembarkationPort,
    p_charter_fee: parsed.data.charterFee,
    p_currency: parsed.data.currency,
    p_tax_rate: parsed.data.taxRate,
    p_commission_rate: parsed.data.commissionRate,
    p_review_notes: parsed.data.reviewNotes,
  })
  if (error) return { message: "Verify a signed charter agreement before saving reviewed fields." }
  refreshBookingDocuments(parsed.data.bookingId)
  return { message: "Reviewed contract fields saved as a draft.", success: true }
}

export async function approveContractReviewAction(
  bookingId: string,
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = contractApprovalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const dates = [parsed.data.payment1Date]
  const amounts = [parsed.data.payment1Amount]
  if (parsed.data.payment2Date !== "" && parsed.data.payment2Amount !== "") {
    dates.push(parsed.data.payment2Date)
    amounts.push(parsed.data.payment2Amount)
  }
  if (parsed.data.payment3Date !== "" && parsed.data.payment3Amount !== "") {
    dates.push(parsed.data.payment3Date)
    amounts.push(parsed.data.payment3Amount)
  }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("approve_contract_review", {
    p_review_id: parsed.data.reviewId,
    p_payment_dates: dates,
    p_payment_amounts: amounts,
  })
  if (error) {
    return { message: "Payment instalments must be valid and total the reviewed charter fee." }
  }
  refreshBookingDocuments(bookingId)
  return {
    message: "Contract data approved; payments, commission, booking dates, and tasks were updated.",
    success: true,
  }
}

export async function markPaymentPaidAction(
  bookingId: string,
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = paymentPaidSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("mark_payment_paid", {
    p_payment_id: parsed.data.paymentId,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "Only a scheduled payment can be recorded paid." }
  refreshBookingDocuments(bookingId)
  return { message: "Payment recorded as paid.", success: true }
}

