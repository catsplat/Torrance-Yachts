import { z } from "zod"

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null)

const bookingDetailsSchema = z.object({
  yacht_id: z.uuid(),
  charter_start_date: z.iso.date(),
  charter_end_date: z.iso.date(),
  embarkation_port: optionalText(120),
  disembarkation_port: optionalText(120),
  guest_count: z.coerce.number().int().min(1).max(36).nullable(),
  charter_fee: z.coerce.number().positive().max(999_999_999_999.99),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  tax_rate: z.coerce.number().min(0).max(100),
}).refine((data) => data.charter_end_date > data.charter_start_date, {
  message: "The charter end date must be after the start date.",
  path: ["charter_end_date"],
})

export const bookingConfirmationSchema = bookingDetailsSchema.extend({
  enquiry_id: z.uuid(),
  source_offer_id: z.uuid(),
  signed_agreement_confirmed: z.literal("on", {
    error: "Confirm that all required parties have signed the agreement.",
  }),
  confirmation_reason: z.string().trim().min(2).max(1000),
})

export const bookingAmendmentSchema = bookingDetailsSchema.extend({
  reason: z.string().trim().min(2).max(1000),
})

export const bookingTransitionSchema = z.object({
  new_status: z.enum(["charter_active", "completed", "cancelled"]),
  reason: z.string().trim().max(1000).default(""),
}).refine((value) => value.new_status !== "cancelled" || value.reason.length >= 2, {
  message: "Add a cancellation reason.",
  path: ["reason"],
})

export const yachtfolioTransitionSchema = z.object({
  new_status: z.enum(["pending", "completed"]),
  reason: z.string().trim().min(2).max(2000),
})

export const availabilitySchema = z.object({
  yacht_id: z.uuid(),
  charter_start_date: z.iso.date(),
  charter_end_date: z.iso.date(),
}).refine((data) => data.charter_end_date > data.charter_start_date, {
  message: "The charter end date must be after the start date.",
  path: ["charter_end_date"],
})

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim()
  return text ? text : null
}

export function parseBookingConfirmationFormData(formData: FormData) {
  return bookingConfirmationSchema.safeParse({
    enquiry_id: formData.get("enquiry_id"),
    source_offer_id: formData.get("source_offer_id"),
    yacht_id: formData.get("yacht_id"),
    charter_start_date: formData.get("charter_start_date"),
    charter_end_date: formData.get("charter_end_date"),
    embarkation_port: formData.get("embarkation_port"),
    disembarkation_port: formData.get("disembarkation_port"),
    guest_count: nullableNumber(formData.get("guest_count")),
    charter_fee: formData.get("charter_fee"),
    currency: formData.get("currency"),
    tax_rate: formData.get("tax_rate"),
    signed_agreement_confirmed: formData.get("signed_agreement_confirmed"),
    confirmation_reason: formData.get("confirmation_reason"),
  })
}

export function parseBookingAmendmentFormData(formData: FormData) {
  return bookingAmendmentSchema.safeParse({
    yacht_id: formData.get("yacht_id"),
    charter_start_date: formData.get("charter_start_date"),
    charter_end_date: formData.get("charter_end_date"),
    embarkation_port: formData.get("embarkation_port"),
    disembarkation_port: formData.get("disembarkation_port"),
    guest_count: nullableNumber(formData.get("guest_count")),
    charter_fee: formData.get("charter_fee"),
    currency: formData.get("currency"),
    tax_rate: formData.get("tax_rate"),
    reason: formData.get("reason"),
  })
}

export function bufferedReservationDates(startDate: string, endDate: string) {
  const shift = (value: string, days: number) => {
    const date = new Date(`${value}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }
  return { reservedFrom: shift(startDate, -1), reservedThrough: shift(endDate, 1) }
}
