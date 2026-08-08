import { z } from "zod"

import { findUnknownOfferPlaceholders } from "./template"

export const salesMaterialTypeValues = [
  "brochure",
  "crew_profiles",
  "sample_menu",
  "specifications",
  "deck_plan",
  "other",
] as const

export const offerStatusValues = ["draft", "approved", "sent", "withdrawn", "superseded"] as const

function blankToNull(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim() === "") return null
  return value
}

const uuid = z.uuid()
const optionalUuid = z.preprocess(blankToNull, z.uuid().nullable())
const money = z.coerce.number().positive().max(999999999999.99)

export const commercialProfileSchema = z.object({
  overview: z.string().trim().min(2).max(10000),
  port_guidance: z.preprocess(blankToNull, z.string().trim().min(2).max(5000).nullable()),
  fuel_consumption_lph: z.preprocess(blankToNull, z.coerce.number().positive().max(999999.99).nullable()),
  fuel_consumption_speed_knots: z.preprocess(blankToNull, z.coerce.number().positive().max(999.99).nullable()),
  short_charter_divisor: z.coerce.number().min(1).max(30),
  default_currency: z.string().trim().toUpperCase().length(3).regex(/^[A-Z]{3}$/),
  default_tax_rate: z.coerce.number().min(0).max(100),
  key_features: z.string().max(10000).transform((value) => (
    value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 50)
  )),
  reference_notes: z.preprocess(blankToNull, z.string().trim().min(2).max(10000).nullable()),
}).superRefine((value, context) => {
  if (Boolean(value.fuel_consumption_lph) !== Boolean(value.fuel_consumption_speed_knots)) {
    context.addIssue({
      code: "custom",
      path: [value.fuel_consumption_lph ? "fuel_consumption_speed_knots" : "fuel_consumption_lph"],
      message: "Enter both fuel consumption and the corresponding speed.",
    })
  }
})

export const ratePeriodSchema = z.object({
  yacht_id: uuid,
  name: z.string().trim().min(2).max(120),
  valid_from: z.iso.date(),
  valid_to: z.iso.date(),
  weekly_rate: money,
  currency: z.string().trim().toUpperCase().length(3).regex(/^[A-Z]{3}$/),
  tax_rate: z.coerce.number().min(0).max(100),
}).superRefine((value, context) => {
  if (value.valid_to < value.valid_from) {
    context.addIssue({ code: "custom", path: ["valid_to"], message: "End date cannot be before start date." })
  }
})

export const salesMaterialSchema = z.object({
  yacht_id: uuid,
  material_type: z.enum(salesMaterialTypeValues),
  label: z.string().trim().min(2).max(160),
  public_url: z.url().max(2048).refine((value) => value.startsWith("https://"), "Use an HTTPS public link."),
  approved_for_offers: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(1000),
})

export const offerTemplateSchema = z.object({
  yacht_id: uuid,
  name: z.string().trim().min(2).max(120),
  subject_template: z.string().trim().min(2).max(300),
  body_template: z.string().trim().min(20).max(30000),
}).superRefine((value, context) => {
  const unknown = findUnknownOfferPlaceholders(`${value.subject_template}\n${value.body_template}`)
  if (unknown.length) {
    context.addIssue({
      code: "custom",
      path: ["body_template"],
      message: `Unknown placeholder${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`,
    })
  }
})

export const offerDraftSchema = z.object({
  enquiry_id: uuid,
  template_version_id: uuid,
  rate_period_id: uuid,
  source_offer_id: optionalUuid,
  recipient_name: z.string().trim().min(2).max(160),
  subject_snapshot: z.string().trim().min(2).max(300),
  body_snapshot: z.string().trim().min(20).max(30000),
  proposed_charter_fee: money,
})

export const offerTransitionSchema = z.object({})

export function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true"
}

export function parseCommercialProfileFormData(formData: FormData) {
  return commercialProfileSchema.safeParse(Object.fromEntries(formData))
}

export function parseRatePeriodFormData(formData: FormData) {
  return ratePeriodSchema.safeParse(Object.fromEntries(formData))
}

export function parseSalesMaterialFormData(formData: FormData) {
  return salesMaterialSchema.safeParse({
    ...Object.fromEntries(formData),
    approved_for_offers: checkboxValue(formData.get("approved_for_offers")),
  })
}

export function parseOfferTemplateFormData(formData: FormData) {
  return offerTemplateSchema.safeParse(Object.fromEntries(formData))
}

export function parseOfferDraftFormData(formData: FormData) {
  return offerDraftSchema.safeParse(Object.fromEntries(formData))
}

export function parseOfferTransitionFormData(formData: FormData) {
  return offerTransitionSchema.safeParse(Object.fromEntries(formData))
}
