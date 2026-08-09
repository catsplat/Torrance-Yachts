import "server-only"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

export const documentRegisterPageSize = 50

const documentCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
})

function decodeDocumentCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return documentCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

export async function getDocumentRegisterPage(filters: {
  cursor?: string
  documentType?: Enums<"document_type">
  query?: string
  scanStatus?: Enums<"document_scan_status">
  verificationStatus?: Enums<"document_verification_status">
}) {
  const cursor = decodeDocumentCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data, error }, { data: totalCount, error: countError }] = await Promise.all([
    supabase.rpc("list_document_register_page", {
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
      p_document_type: filters.documentType,
      p_limit: documentRegisterPageSize + 1,
      p_query: filters.query,
      p_scan_status: filters.scanStatus,
      p_verification_status: filters.verificationStatus,
    }),
    supabase.rpc("count_document_register", {
      p_document_type: filters.documentType,
      p_query: filters.query,
      p_scan_status: filters.scanStatus,
      p_verification_status: filters.verificationStatus,
    }),
  ])
  if (error || countError) throw new Error("Unable to load the document register.")

  const hasNextPage = data.length > documentRegisterPageSize
  const documents = data.slice(0, documentRegisterPageSize)
  const last = documents.at(-1)
  return {
    documents,
    nextCursor: hasNextPage && last
      ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
      : null,
    totalCount: totalCount ?? 0,
  }
}

export async function getBookingDocumentWorkspace(bookingId: string) {
  const supabase = await createClient()
  const [
    bookingResult,
    requirementsResult,
    documentsResult,
    reviewsResult,
    paymentsResult,
    commissionResult,
    generatedInvoicesResult,
  ] = await Promise.all([
    supabase.from("bookings").select(`
      id, reference, charter_start_date, charter_end_date, charter_fee, currency,
      tax_rate, embarkation_port, disembarkation_port,
      yacht:yachts!bookings_yacht_id_fkey(name)
    `).eq("id", bookingId).single(),
    supabase.from("booking_document_requirements").select("*")
      .eq("booking_id", bookingId).order("required", { ascending: false }),
    supabase.from("documents").select(`
      id, booking_id, requirement_id, document_type, title, original_filename,
      storage_bucket, storage_path, mime_type, size_bytes, version_number,
      verification_status, verification_notes, scan_status, scanner_detail,
      scan_attempts, retention_class, created_at,
      uploader:profiles!documents_created_by_fkey(display_name)
    `).eq("booking_id", bookingId).order("created_at", { ascending: false }),
    supabase.from("contract_reviews").select("*").eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
    supabase.from("payment_schedules").select("*").eq("booking_id", bookingId)
      .order("instalment_number"),
    supabase.from("commission_calculations").select("*")
      .eq("booking_id", bookingId).order("created_at", { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from("generated_invoices").select("*")
      .eq("booking_id", bookingId).order("generated_at", { ascending: false }),
  ])
  if (
    bookingResult.error || requirementsResult.error || documentsResult.error ||
    reviewsResult.error || paymentsResult.error || commissionResult.error ||
    generatedInvoicesResult.error
  ) {
    throw new Error("Unable to load the private booking document workspace.")
  }

  const documents = await Promise.all(documentsResult.data.map(async (document) => {
    if (document.scan_status !== "released") {
      return { ...document, signedUrl: null }
    }
    const { data } = await supabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 300)
    return { ...document, signedUrl: data?.signedUrl ?? null }
  }))

  return {
    booking: bookingResult.data,
    commission: commissionResult.data,
    documents,
    generatedInvoices: generatedInvoicesResult.data,
    payments: paymentsResult.data,
    requirements: requirementsResult.data,
    reviews: reviewsResult.data,
  }
}
