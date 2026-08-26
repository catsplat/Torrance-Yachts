import { z } from "zod"

export const communicationTemplateKindValues = [
  "kyc_request",
  "captain_contact",
  "broker_follow_up",
] as const

export const communicationTemplateDraftSchema = z.object({
  bodyTemplate: z.string().trim().min(20).max(30000),
  kind: z.enum(communicationTemplateKindValues),
  name: z.string().trim().min(2).max(160),
  subjectTemplate: z.string().trim().max(300),
})

export const communicationTemplateUpdateSchema = communicationTemplateDraftSchema.omit({
  kind: true,
}).extend({ templateId: z.uuid() })

export const communicationTemplateCloneSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sourceTemplateId: z.uuid(),
})

export const communicationTemplateApprovalSchema = z.object({ templateId: z.uuid() })
