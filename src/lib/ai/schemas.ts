import { z } from "zod"

export const aiClassificationValues = [
  "unclassified",
  "new_enquiry",
  "enquiry_follow_up",
  "internal",
  "circular",
  "other_relevant",
] as const

const nullableText = z.string().trim().max(2000).nullable()
const nullableDate = z.union([
  z.null(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
])

export const providerEvidenceSchema = z.object({
  confidence: z.number().min(0).max(1),
  excerpt: z.string().trim().min(1).max(1000),
  field_path: z.string().regex(/^[a-z][a-z0-9_.]{0,159}$/),
})

export const emailAiSuggestionSchema = z.object({
  classification: z.enum(aiClassificationValues),
  confidence: z.number().min(0).max(1),
  confidence_reason: z.string().trim().min(2).max(2000),
  draft: z.object({
    body: z.string().trim().max(30000),
    subject: z.string().trim().max(300),
  }),
  evidence: z.array(providerEvidenceSchema).max(40),
  extracted: z.object({
    budget_amount: z.number().min(0).nullable(),
    charter_end_date: nullableDate,
    charter_start_date: nullableDate,
    company_name: nullableText,
    currency: z.union([z.null(), z.string().regex(/^[A-Z]{3}$/)]),
    customer_email: z.union([z.null(), z.email()]),
    customer_name: nullableText,
    customer_phone: nullableText,
    disembarkation_port: nullableText,
    embarkation_port: nullableText,
    guest_count: z.number().int().min(1).max(36).nullable(),
    requested_yacht_name: nullableText,
    requirements: z.array(z.string().trim().min(1).max(500)).max(30),
  }),
  summary: z.string().trim().min(2).max(5000),
})

export const contractAiSuggestionSchema = z.object({
  confidence: z.number().min(0).max(1),
  confidence_reason: z.string().trim().min(2).max(2000),
  evidence: z.array(providerEvidenceSchema).max(50),
  extracted: z.object({
    broker_company_name: nullableText,
    broker_name: nullableText,
    charter_end_date: nullableDate,
    charter_fee: z.number().positive().nullable(),
    charter_start_date: nullableDate,
    charterer_name: nullableText,
    commission_rate: z.number().min(0).max(100).nullable(),
    currency: z.union([z.null(), z.string().regex(/^[A-Z]{3}$/)]),
    disembarkation_port: nullableText,
    embarkation_port: nullableText,
    instalments: z.array(z.object({
      amount: z.number().positive(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).max(3),
    tax_rate: z.number().min(0).max(100).nullable(),
    yacht_name: nullableText,
  }),
  summary: z.string().trim().min(2).max(5000),
})

export const aiReviewSchema = z.object({
  approved: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason: z.string().trim().min(2).max(2000),
  suggestionId: z.uuid(),
})

export const emailSuggestionRevisionSchema = z.object({
  budgetAmount: z.union([z.literal(""), z.coerce.number().min(0)]),
  charterEndDate: z.union([z.literal(""), z.iso.date()]),
  charterStartDate: z.union([z.literal(""), z.iso.date()]),
  classification: z.enum(aiClassificationValues),
  companyName: z.string().trim().max(2000),
  correctionReason: z.string().trim().min(2).max(2000),
  currency: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)]),
  customerEmail: z.union([z.literal(""), z.email()]),
  customerName: z.string().trim().max(2000),
  customerPhone: z.string().trim().max(2000),
  disembarkationPort: z.string().trim().max(2000),
  draftBody: z.string().trim().max(30000),
  draftSubject: z.string().trim().max(300),
  embarkationPort: z.string().trim().max(2000),
  guestCount: z.union([z.literal(""), z.coerce.number().int().min(1).max(36)]),
  requestedYachtName: z.string().trim().max(2000),
  requirements: z.string().max(10000),
  suggestionId: z.uuid(),
  summary: z.string().trim().min(2).max(5000),
})

export const contractSuggestionRevisionSchema = z.object({
  brokerCompanyName: z.string().trim().max(2000),
  brokerName: z.string().trim().max(2000),
  charterEndDate: z.union([z.literal(""), z.iso.date()]),
  charterFee: z.union([z.literal(""), z.coerce.number().positive()]),
  charterStartDate: z.union([z.literal(""), z.iso.date()]),
  chartererName: z.string().trim().max(2000),
  commissionRate: z.union([z.literal(""), z.coerce.number().min(0).max(100)]),
  correctionReason: z.string().trim().min(2).max(2000),
  currency: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)]),
  disembarkationPort: z.string().trim().max(2000),
  embarkationPort: z.string().trim().max(2000),
  instalment1Amount: z.union([z.literal(""), z.coerce.number().positive()]),
  instalment1Date: z.union([z.literal(""), z.iso.date()]),
  instalment2Amount: z.union([z.literal(""), z.coerce.number().positive()]),
  instalment2Date: z.union([z.literal(""), z.iso.date()]),
  instalment3Amount: z.union([z.literal(""), z.coerce.number().positive()]),
  instalment3Date: z.union([z.literal(""), z.iso.date()]),
  suggestionId: z.uuid(),
  summary: z.string().trim().min(2).max(5000),
  taxRate: z.union([z.literal(""), z.coerce.number().min(0).max(100)]),
  yachtName: z.string().trim().max(2000),
}).superRefine((value, context) => {
  for (const number of [1, 2, 3] as const) {
    const date = value[`instalment${number}Date`]
    const amount = value[`instalment${number}Amount`]
    if ((date === "") !== (amount === "")) {
      context.addIssue({
        code: "custom",
        message: `Instalment ${number} requires both a date and amount.`,
      })
    }
  }
})

export const emailAiRequestSchema = z.object({ messageId: z.uuid() })
export const contractAiRequestSchema = z.object({
  bookingId: z.uuid(),
  contractText: z.string().trim().min(50).max(30000),
  documentId: z.uuid(),
})

export type EmailAiSuggestion = z.infer<typeof emailAiSuggestionSchema>
export type ContractAiSuggestion = z.infer<typeof contractAiSuggestionSchema>
export type ProviderEvidence = z.infer<typeof providerEvidenceSchema>
