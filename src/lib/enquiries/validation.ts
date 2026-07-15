import { z } from "zod"

export const enquiryStatusValues = [
  "new",
  "waiting_for_reply",
  "offer_sent",
  "negotiating",
  "contract_issued",
  "awaiting_signatures",
  "booked",
  "charter_active",
  "completed",
  "archived",
  "cancelled",
] as const

export const enquiryPriorityValues = ["low", "normal", "high", "urgent"] as const
export const enquiryNoteKindValues = ["internal", "requirement", "follow_up"] as const

function blankToNull(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim() === "") return null
  return value
}

const optionalUuid = z.preprocess(blankToNull, z.uuid().nullable())
const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable())

function optionalTrimmedText(maximum: number) {
  return z.preprocess(
    blankToNull,
    z.string().trim().min(2).max(maximum).nullable(),
  )
}

function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess(blankToNull, z.coerce.number().pipe(schema).nullable())
}

export const enquirySchema = z
  .object({
    customer_contact_id: optionalUuid,
    broker_contact_id: optionalUuid,
    broker_company_id: optionalUuid,
    requested_yacht_id: optionalUuid,
    owner_user_id: optionalUuid,
    summary: z.string().trim().min(2).max(2000),
    priority: z.enum(enquiryPriorityValues),
    charter_start_date: optionalDate,
    charter_end_date: optionalDate,
    guest_count: optionalNumber(z.number().int().min(1).max(36)),
    embarkation_port: optionalTrimmedText(120),
    disembarkation_port: optionalTrimmedText(120),
    budget_amount: optionalNumber(z.number().min(0).max(999999999999.99)),
    currency: z.preprocess(
      (value) => {
        const normalised = blankToNull(value)
        return typeof normalised === "string" ? normalised.trim().toUpperCase() : normalised
      },
      z.string().length(3).regex(/^[A-Z]{3}$/).nullable(),
    ),
  })
  .superRefine((value, context) => {
    if (
      !value.customer_contact_id &&
      !value.broker_contact_id &&
      !value.broker_company_id
    ) {
      context.addIssue({
        code: "custom",
        message: "Select at least one customer, broker, or broker company.",
        path: ["customer_contact_id"],
      })
    }

    if (Boolean(value.charter_start_date) !== Boolean(value.charter_end_date)) {
      context.addIssue({
        code: "custom",
        message: "Enter both charter dates or leave both blank.",
        path: ["charter_end_date"],
      })
    }

    if (
      value.charter_start_date &&
      value.charter_end_date &&
      value.charter_end_date < value.charter_start_date
    ) {
      context.addIssue({
        code: "custom",
        message: "The charter end date cannot be before the start date.",
        path: ["charter_end_date"],
      })
    }

    if (Boolean(value.budget_amount !== null) !== Boolean(value.currency)) {
      context.addIssue({
        code: "custom",
        message: "Enter both a budget and currency or leave both blank.",
        path: [value.budget_amount === null ? "budget_amount" : "currency"],
      })
    }
  })

export const enquiryNoteSchema = z.object({
  kind: z.enum(enquiryNoteKindValues),
  body: z.string().trim().min(2).max(10000),
})

export const enquiryTransitionSchema = z.object({
  new_status: z.enum(enquiryStatusValues),
  reason: z.string().trim().min(2).max(1000),
})

export function parseEnquiryFormData(formData: FormData) {
  return enquirySchema.safeParse({
    customer_contact_id: formData.get("customer_contact_id"),
    broker_contact_id: formData.get("broker_contact_id"),
    broker_company_id: formData.get("broker_company_id"),
    requested_yacht_id: formData.get("requested_yacht_id"),
    owner_user_id: formData.get("owner_user_id"),
    summary: formData.get("summary"),
    priority: formData.get("priority"),
    charter_start_date: formData.get("charter_start_date"),
    charter_end_date: formData.get("charter_end_date"),
    guest_count: formData.get("guest_count"),
    embarkation_port: formData.get("embarkation_port"),
    disembarkation_port: formData.get("disembarkation_port"),
    budget_amount: formData.get("budget_amount"),
    currency: formData.get("currency"),
  })
}

export function parseEnquiryNoteFormData(formData: FormData) {
  return enquiryNoteSchema.safeParse({
    kind: formData.get("kind"),
    body: formData.get("body"),
  })
}

export function parseEnquiryTransitionFormData(formData: FormData) {
  return enquiryTransitionSchema.safeParse({
    new_status: formData.get("new_status"),
    reason: formData.get("reason"),
  })
}

export function normaliseEnquirySearch(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("en-GB").slice(0, 160) ?? ""
}
