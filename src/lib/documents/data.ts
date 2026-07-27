import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export const getDocumentRegister = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("documents").select(`
    id, booking_id, document_type, title, original_filename, mime_type,
    size_bytes, version_number, verification_status, scan_status, retention_class, created_at,
    booking:bookings!documents_booking_id_fkey(
      reference,
      yacht:yachts!bookings_yacht_id_fkey(name)
    )
  `).order("created_at", { ascending: false }).limit(1000)
  if (error) throw new Error("Unable to load the document register.")
  return data
})

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
