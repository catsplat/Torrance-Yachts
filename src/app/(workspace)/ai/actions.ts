"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  aiReviewSchema,
  contractAiRequestSchema,
  contractAiSuggestionSchema,
  contractSuggestionRevisionSchema,
  emailAiRequestSchema,
  emailAiSuggestionSchema,
  emailSuggestionRevisionSchema,
} from "@/lib/ai/schemas"
import {
  generateContractSuggestion,
  generateEmailSuggestion,
} from "@/lib/ai/service"
import {
  communicationTemplateApprovalSchema,
  communicationTemplateCloneSchema,
  communicationTemplateDraftSchema,
  communicationTemplateUpdateSchema,
} from "@/lib/ai/template-validation"

export type AiActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const requestTokenSchema = z.uuid()

function validationState(error: z.ZodError): AiActionState {
  return { fieldErrors: error.flatten().fieldErrors, message: "Review the highlighted fields." }
}

async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? { message: "Your session has expired. Sign in again." }
}

export async function generateEmailAiSuggestionAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = emailAiRequestSchema.safeParse(Object.fromEntries(formData))
  const requestToken = requestTokenSchema.safeParse(formData.get("requestToken"))
  if (!parsed.success) return validationState(parsed.error)
  if (!requestToken.success) return { message: "Refresh the page before starting a new analysis." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  try {
    const result = await generateEmailSuggestion(context, parsed.data.messageId, requestToken.data)
    revalidatePath("/")
    revalidatePath("/emails")
    revalidatePath(`/emails/${parsed.data.messageId}`)
    return {
      message: result.existing
        ? "The existing validated suggestion was loaded."
        : "Email analysis is ready for review.",
      success: true,
    }
  } catch {
    return { message: "The email could not be analysed. Review it manually or try again." }
  }
}

export async function generateContractAiSuggestionAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = contractAiRequestSchema.safeParse(Object.fromEntries(formData))
  const requestToken = requestTokenSchema.safeParse(formData.get("requestToken"))
  if (!parsed.success) return validationState(parsed.error)
  if (!requestToken.success) return { message: "Refresh the page before starting a new extraction." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  try {
    const result = await generateContractSuggestion(context, {
      contractText: parsed.data.contractText,
      documentId: parsed.data.documentId,
      requestToken: requestToken.data,
    })
    revalidatePath(`/bookings/${parsed.data.bookingId}/documents`)
    return {
      message: result.existing
        ? "The existing validated extraction was loaded."
        : "Contract suggestion created. No booking, payment, or task was changed.",
      success: true,
    }
  } catch {
    return { message: "Contract extraction failed safely. Continue with manual review." }
  }
}

export async function reviseEmailAiSuggestionAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = emailSuggestionRevisionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data: current, error: readError } = await context.supabase
    .from("ai_suggestions")
    .select("reviewed_payload, source_id")
    .eq("id", parsed.data.suggestionId)
    .eq("status", "pending_review")
    .single()
  if (readError || !current) return { message: "Pending email suggestion not found." }
  const existing = emailAiSuggestionSchema.safeParse(current.reviewed_payload)
  if (!existing.success) return { message: "The stored suggestion is not valid for email review." }
  const revised = {
    ...existing.data,
    classification: parsed.data.classification,
    draft: { body: parsed.data.draftBody, subject: parsed.data.draftSubject },
    extracted: {
      ...existing.data.extracted,
      budget_amount: parsed.data.budgetAmount === "" ? null : parsed.data.budgetAmount,
      charter_end_date: parsed.data.charterEndDate || null,
      charter_start_date: parsed.data.charterStartDate || null,
      company_name: parsed.data.companyName || null,
      currency: parsed.data.currency || null,
      customer_email: parsed.data.customerEmail || null,
      customer_name: parsed.data.customerName || null,
      customer_phone: parsed.data.customerPhone || null,
      disembarkation_port: parsed.data.disembarkationPort || null,
      embarkation_port: parsed.data.embarkationPort || null,
      guest_count: parsed.data.guestCount === "" ? null : parsed.data.guestCount,
      requested_yacht_name: parsed.data.requestedYachtName || null,
      requirements: parsed.data.requirements.split("\n").map((value) => value.trim()).filter(Boolean),
    },
    summary: parsed.data.summary,
  }
  const { error } = await context.supabase.rpc("revise_ai_suggestion", {
    p_reason: "Suggestion details corrected by staff",
    p_revised_payload: revised,
    p_suggestion_id: parsed.data.suggestionId,
  })
  if (error) return { message: "The pending suggestion could not be corrected." }
  revalidatePath(`/emails/${current.source_id}`)
  return { message: "Corrections saved.", success: true }
}

export async function reviseContractAiSuggestionAction(
  bookingId: string,
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = contractSuggestionRevisionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data: current, error: readError } = await context.supabase
    .from("ai_suggestions")
    .select("reviewed_payload")
    .eq("id", parsed.data.suggestionId)
    .eq("status", "pending_review")
    .single()
  if (readError || !current) return { message: "Pending contract suggestion not found." }
  const existing = contractAiSuggestionSchema.safeParse(current.reviewed_payload)
  if (!existing.success) return { message: "The stored suggestion is not valid for contract review." }
  const instalmentInputs = [
    [parsed.data.instalment1Date, parsed.data.instalment1Amount],
    [parsed.data.instalment2Date, parsed.data.instalment2Amount],
    [parsed.data.instalment3Date, parsed.data.instalment3Amount],
  ] as const
  const instalments = instalmentInputs.flatMap(([date, amount]) => {
    return date !== "" && amount !== "" ? [{ amount, due_date: date }] : []
  })
  const revised = {
    ...existing.data,
    extracted: {
      broker_company_name: parsed.data.brokerCompanyName || null,
      broker_name: parsed.data.brokerName || null,
      charter_end_date: parsed.data.charterEndDate || null,
      charter_fee: parsed.data.charterFee === "" ? null : parsed.data.charterFee,
      charter_start_date: parsed.data.charterStartDate || null,
      charterer_name: parsed.data.chartererName || null,
      commission_rate: parsed.data.commissionRate === "" ? null : parsed.data.commissionRate,
      currency: parsed.data.currency || null,
      disembarkation_port: parsed.data.disembarkationPort || null,
      embarkation_port: parsed.data.embarkationPort || null,
      instalments,
      tax_rate: parsed.data.taxRate === "" ? null : parsed.data.taxRate,
      yacht_name: parsed.data.yachtName || null,
    },
    summary: parsed.data.summary,
  }
  const { error } = await context.supabase.rpc("revise_ai_suggestion", {
    p_reason: "Contract details corrected by staff",
    p_revised_payload: revised,
    p_suggestion_id: parsed.data.suggestionId,
  })
  if (error) return { message: "The pending contract suggestion could not be corrected." }
  revalidatePath(`/bookings/${bookingId}/documents`)
  return { message: "Corrections saved.", success: true }
}

export async function reviewAiSuggestionAction(
  returnPath: string,
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = aiReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("review_ai_suggestion", {
    p_approved: parsed.data.approved,
    p_reason: parsed.data.approved ? "Suggestion approved" : "Suggestion rejected",
    p_suggestion_id: parsed.data.suggestionId,
  })
  if (error) return { message: "Only a pending suggestion can be reviewed." }
  revalidatePath("/")
  revalidatePath(returnPath)
  return {
    message: parsed.data.approved
      ? "Suggestion approved."
      : "Suggestion rejected.",
    success: true,
  }
}

export async function createCommunicationTemplateAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = communicationTemplateDraftSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("create_communication_template_draft", {
    p_body_template: parsed.data.bodyTemplate,
    p_kind: parsed.data.kind,
    p_name: parsed.data.name,
    p_subject_template: parsed.data.subjectTemplate,
  })
  if (error) return { message: "The template was rejected. Check permissions and placeholders." }
  revalidatePath("/settings")
  revalidatePath("/settings/communications")
  return { message: "Editable communication-template draft created.", success: true }
}

export async function updateCommunicationTemplateAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = communicationTemplateUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_communication_template_draft", {
    p_body_template: parsed.data.bodyTemplate,
    p_name: parsed.data.name,
    p_subject_template: parsed.data.subjectTemplate,
    p_template_id: parsed.data.templateId,
  })
  if (error) return { message: "Only an administrator can edit a draft template." }
  revalidatePath("/settings/communications")
  return { message: "Communication-template draft updated.", success: true }
}

export async function cloneCommunicationTemplateAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = communicationTemplateCloneSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("clone_communication_template", {
    p_name: parsed.data.name,
    p_source_template_id: parsed.data.sourceTemplateId,
  })
  if (error) return { message: "Only an administrator can clone a template version." }
  revalidatePath("/settings/communications")
  return { message: "New editable template version created.", success: true }
}

export async function approveCommunicationTemplateAction(
  _state: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const parsed = communicationTemplateApprovalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("approve_communication_template", {
    p_template_id: parsed.data.templateId,
  })
  if (error) return { message: "Only an administrator can approve a draft template." }
  revalidatePath("/settings")
  revalidatePath("/settings/communications")
  return { message: "Template approved; the previous approved version was retired.", success: true }
}
