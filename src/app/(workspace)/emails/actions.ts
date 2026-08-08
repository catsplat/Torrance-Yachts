"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  emailClassificationSchema,
  operationalSettingsSchema,
} from "@/lib/emails/validation"

export type EmailActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}
function validationState(error: z.ZodError): EmailActionState {
  return { fieldErrors: error.flatten().fieldErrors, message: "Review the highlighted fields." }
}

async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? { message: "Your session has expired. Sign in again." }
}

export async function classifyEmailAction(
  _state: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  const parsed = emailClassificationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("classify_email_message_with_details", {
    p_budget_amount: parsed.data.budgetAmount === "" ? undefined : parsed.data.budgetAmount,
    p_charter_end_date: parsed.data.charterEndDate || undefined,
    p_charter_start_date: parsed.data.charterStartDate || undefined,
    p_message_id: parsed.data.messageId,
    p_classification: parsed.data.classification,
    p_reason: `Classified as ${parsed.data.classification.replaceAll("_", " ")}`,
    p_enquiry_id: parsed.data.enquiryId || undefined,
    p_contact_id: parsed.data.contactId || undefined,
    p_enquiry_summary: parsed.data.enquirySummary || undefined,
    p_currency: parsed.data.currency || undefined,
    p_disembarkation_port: parsed.data.disembarkationPort || undefined,
    p_embarkation_port: parsed.data.embarkationPort || undefined,
    p_guest_count: parsed.data.guestCount === "" ? undefined : parsed.data.guestCount,
    p_requested_yacht_id: parsed.data.requestedYachtId || undefined,
  })
  if (error) {
    return { message: "The classification could not be applied. Check the selected contact or enquiry." }
  }
  revalidatePath("/")
  revalidatePath("/emails")
  revalidatePath(`/emails/${parsed.data.messageId}`)
  revalidatePath("/enquiries")
  return { message: "Email classification recorded and downstream work queued.", success: true }
}

export async function updateOperationalSettingsAction(
  _state: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  const parsed = operationalSettingsSchema.safeParse({
    enquiryTimeoutEnabled: formData.get("enquiryTimeoutEnabled") ? "on" : "off",
    internalEmailDomains: formData.get("internalEmailDomains"),
    negotiatingTimeoutDays: formData.get("negotiatingTimeoutDays"),
    newEnquiryTimeoutDays: formData.get("newEnquiryTimeoutDays"),
    offerSentTimeoutDays: formData.get("offerSentTimeoutDays"),
    waitingReplyTimeoutDays: formData.get("waitingReplyTimeoutDays"),
  })
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_operational_settings", {
    p_enquiry_timeout_enabled: parsed.data.enquiryTimeoutEnabled,
    p_internal_email_domains: parsed.data.internalEmailDomains,
    p_negotiating_timeout_days: parsed.data.negotiatingTimeoutDays,
    p_new_enquiry_timeout_days: parsed.data.newEnquiryTimeoutDays,
    p_offer_sent_timeout_days: parsed.data.offerSentTimeoutDays,
    p_waiting_reply_timeout_days: parsed.data.waitingReplyTimeoutDays,
  })
  if (error) return { message: "Only an administrator can update operational settings." }
  revalidatePath("/settings")
  return { message: "Timeout and deterministic email-routing settings updated.", success: true }
}

export async function runEnquiryTimeoutSweepAction(
  _state: EmailActionState,
  _formData: FormData,
): Promise<EmailActionState> {
  void _formData
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("apply_enquiry_timeouts", {
    p_as_of: new Date().toISOString(),
  })
  if (error) return { message: "The timeout sweep could not be completed." }
  revalidatePath("/")
  revalidatePath("/enquiries")
  revalidatePath("/settings")
  return {
    message: `${data ?? 0} inactive ${data === 1 ? "enquiry was" : "enquiries were"} archived.`,
    success: true,
  }
}
