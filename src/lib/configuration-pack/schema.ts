import { z } from "zod"

const optionalText = z.string().trim().max(30_000).optional()
const optionalSubject = z.string().trim().max(300).optional().default("")

// These names map to reviewed operational records at draft-render time. Keeping
// the list explicit prevents a configuration import from silently accepting a
// misspelled placeholder and sending an incomplete draft later.
const availableTemplateVariables = new Set([
  "broker_company_name", "broker_email", "broker_name", "captain_email",
  "captain_name", "charter_end_date", "charter_fee", "charter_start_date",
  "client_name", "currency", "embarkation_port", "guest_count", "invoice_date",
  "invoice_number", "payment_amount", "payment_due_date", "tax_rate", "vessel_name",
  "year",
])

function validateTemplateVariables(value: string, context: z.RefinementCtx, path: (string | number)[]) {
  for (const match of value.matchAll(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g)) {
    if (!availableTemplateVariables.has(match[1])) {
      context.addIssue({
        code: "custom",
        message: `Unknown template variable: ${match[1]}.`,
        path,
      })
    }
  }
}

const rateSchema = z.object({
  active: z.boolean().optional(), currency: z.string().trim().length(3).optional(),
  name: z.string().trim().min(2).max(120), tax_rate: z.number().min(0).max(100).optional(),
  valid_from: z.string().date(), valid_to: z.string().date(), weekly_rate: z.number().positive(),
})

const workflowStepSchema = z.object({
  after: z.array(z.string().trim().min(1).max(20)).optional(),
  code: z.string().trim().regex(/^\d+(?:\.(?:\d|[A-Z]))?$/), description: optionalText,
  due_anchor: z.enum(["none", "booking_confirmed", "charter_start", "charter_end", "contract_payment_1", "contract_payment_2", "contract_payment_3"]).optional(),
  due_date_required: z.boolean().optional(), due_offset_days: z.number().int().min(-365).max(365).optional(),
  escalation_after_days: z.number().int().min(0).max(365).optional(), external_action: z.enum(["none", "yachtfolio_booking"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(), reminder_lead_days: z.number().int().min(0).max(365).optional(),
  required: z.boolean().optional(), sort_order: z.number().int().min(0).max(10_000).optional(), title: z.string().trim().min(2).max(240),
})

const contactRoleValues = ["customer", "charterer", "broker", "captain", "crew", "operations", "supplier", "other"] as const
const yachtResponsibilityValues = ["captain", "manager", "operations", "notification_recipient", "crew", "other"] as const

const contactSchema = z.object({
  company_name: optionalText,
  email: z.email().max(320).optional(),
  full_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(32).optional(),
  roles: z.array(z.enum(contactRoleValues)).min(1).max(8),
  yacht_assignments: z.array(z.object({
    is_primary: z.boolean().optional(),
    notifications_enabled: z.boolean().optional(),
    notes: optionalText,
    responsibility: z.enum(yachtResponsibilityValues),
    yacht_name: z.string().trim().min(2).max(120),
  })).max(50).optional(),
})

const invoiceProfileSchema = z.object({
  issuer_address: z.string().trim().min(2).max(2_000),
  issuer_name: z.string().trim().min(2).max(200),
  payment_instructions: z.string().trim().min(2).max(5_000),
  profile_name: z.string().trim().min(2).max(120),
  recipient_address: z.string().trim().min(2).max(2_000),
  recipient_email: z.email().max(320).optional(),
  recipient_name: z.string().trim().min(2).max(200),
  service_description_template: z.string().trim().min(2).max(1_000),
})

export const configurationPackSchema = z.object({
  contacts: z.array(contactSchema).max(500).optional(),
  communication_templates: z.array(z.object({
    body: z.string().trim().min(20).max(30_000), kind: z.enum(["kyc_request", "captain_contact", "broker_follow_up"]),
    name: z.string().trim().min(2).max(160), subject: optionalSubject,
  })).max(20).optional(),
  invoice_profile: invoiceProfileSchema.optional(),
  version: z.literal(1),
  workflow: z.object({ description: optionalText, name: z.string().trim().min(2).max(160), steps: z.array(workflowStepSchema).min(1).max(100) }).optional(),
  yachts: z.array(z.object({
    beam_metres: z.number().positive().optional(), builder: optionalText, cabin_count: z.number().int().positive().optional(), crew_count: z.number().int().positive().optional(),
    commercial_profile: z.object({ default_currency: z.string().trim().length(3).optional(), default_tax_rate: z.number().min(0).max(100).optional(), fuel_consumption_lph: z.number().positive().optional(), fuel_consumption_speed_knots: z.number().positive().optional(), key_features: z.array(z.string().trim().min(2).max(500)).max(50).optional(), overview: z.string().trim().min(2).max(10_000), port_guidance: optionalText, reference_notes: optionalText, short_charter_divisor: z.number().min(1).max(30).optional() }).optional(),
    guest_capacity: z.number().int().positive().optional(), home_port: optionalText, length_metres: z.number().positive().optional(), name: z.string().trim().min(2).max(120),
    notification_phone: optionalText, notes: optionalText, offer_template: z.object({ body: z.string().trim().min(20).max(30_000), name: z.string().trim().min(2).max(120), subject: z.string().trim().min(2).max(300) }).optional(),
    preferred_ports: z.array(z.string().trim().min(2).max(120)).max(50).optional(), rates: z.array(rateSchema).max(100).optional(),
    sales_materials: z.array(z.object({ active: z.boolean().optional(), label: z.string().trim().min(2).max(160), sort_order: z.number().int().min(0).max(1_000).optional(), type: z.enum(["brochure", "crew_profiles", "sample_menu", "specifications", "deck_plan", "other"]), url: z.url().startsWith("https://") })).max(50).optional(),
    year_built: z.number().int().min(1900).max(2100).optional(),
  })).max(50).optional(),
}).strict().superRefine((pack, context) => {
  pack.communication_templates?.forEach((template, index) => {
    validateTemplateVariables(template.subject ?? "", context, ["communication_templates", index, "subject"])
    validateTemplateVariables(template.body, context, ["communication_templates", index, "body"])
  })
  pack.yachts?.forEach((yacht, index) => {
    if (!yacht.offer_template) return
    validateTemplateVariables(yacht.offer_template.subject, context, ["yachts", index, "offer_template", "subject"])
    validateTemplateVariables(yacht.offer_template.body, context, ["yachts", index, "offer_template", "body"])
  })
})

export type ConfigurationPack = z.infer<typeof configurationPackSchema>

export function parseConfigurationPack(input: string) {
  if (input.length > 500_000) return { error: "The configuration pack is too large." } as const
  try {
    const parsed = configurationPackSchema.safeParse(JSON.parse(input))
    return parsed.success ? { data: parsed.data } as const : { error: parsed.error.issues[0]?.message ?? "The configuration pack is invalid." } as const
  } catch {
    return { error: "Use valid JSON (which is also valid YAML 1.2)." } as const
  }
}
