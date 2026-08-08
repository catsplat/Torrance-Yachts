"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  parseCommercialProfileFormData,
  parseOfferDraftFormData,
  parseOfferTemplateFormData,
  parseOfferTransitionFormData,
  parseRatePeriodFormData,
  parseSalesMaterialFormData,
} from "@/lib/offers/validation"

export type OfferActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const idSchema = z.uuid()
const expiredMessage = "Your session has expired. Sign in again."

function validationState(error: z.ZodError): OfferActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Review the highlighted fields.",
  }
}

export async function saveCommercialProfileAction(
  yachtId: string,
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const validId = idSchema.safeParse(yachtId)
  const parsed = parseCommercialProfileFormData(formData)
  if (!validId.success) return { message: "The yacht reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.from("yacht_commercial_profiles").upsert({
    yacht_id: validId.data,
    ...parsed.data,
  }, { onConflict: "yacht_id" })

  if (error) return { message: "The commercial profile could not be saved." }
  revalidatePath(`/yachts/${validId.data}`)
  revalidatePath(`/yachts/${validId.data}/commercial`)
  return { message: "Commercial profile saved and audited.", success: true }
}

export async function createRatePeriodAction(
  yachtId: string,
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const validId = idSchema.safeParse(yachtId)
  const parsed = parseRatePeriodFormData(formData)
  if (!validId.success) return { message: "The yacht reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.from("yacht_rate_periods").insert({
    ...parsed.data,
    yacht_id: validId.data,
  })

  if (error) {
    return {
      message: error.code === "23P01"
        ? "This rate overlaps another active rate for the yacht."
        : "The rate period could not be created.",
    }
  }
  revalidatePath(`/yachts/${validId.data}/commercial`)
  return { message: "Rate period added.", success: true }
}

export async function setRatePeriodActiveAction(
  yachtId: string,
  rateId: string,
  active: boolean,
): Promise<void> {
  const yacht = idSchema.safeParse(yachtId)
  const rate = idSchema.safeParse(rateId)
  if (!yacht.success || !rate.success) return
  const context = await getAuthenticatedRequestContext()
  if (!context) return
  await context.supabase.from("yacht_rate_periods").update({ active })
    .eq("id", rate.data).eq("yacht_id", yacht.data)
  revalidatePath(`/yachts/${yacht.data}/commercial`)
}

export async function createSalesMaterialAction(
  yachtId: string,
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const validId = idSchema.safeParse(yachtId)
  const parsed = parseSalesMaterialFormData(formData)
  if (!validId.success) return { message: "The yacht reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }
  const { error } = await context.supabase.from("yacht_sales_materials").insert({
    ...parsed.data,
    yacht_id: validId.data,
  })
  if (error) return { message: "The sales-material link could not be added." }
  revalidatePath(`/yachts/${validId.data}/commercial`)
  return { message: "Sales-material link added.", success: true }
}

export async function setSalesMaterialStateAction(
  yachtId: string,
  materialId: string,
  active: boolean,
  approvedForOffers: boolean,
): Promise<void> {
  const yacht = idSchema.safeParse(yachtId)
  const material = idSchema.safeParse(materialId)
  if (!yacht.success || !material.success) return
  const context = await getAuthenticatedRequestContext()
  if (!context) return
  await context.supabase.from("yacht_sales_materials").update({
    active,
    approved_for_offers: approvedForOffers,
  }).eq("id", material.data).eq("yacht_id", yacht.data)
  revalidatePath(`/yachts/${yacht.data}/commercial`)
}

export async function createOfferTemplateAction(
  yachtId: string,
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const validId = idSchema.safeParse(yachtId)
  const parsed = parseOfferTemplateFormData(formData)
  if (!validId.success) return { message: "The yacht reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }
  const { error } = await context.supabase.from("yacht_offer_templates").insert({
    ...parsed.data,
    yacht_id: validId.data,
    version_number: null as unknown as number,
  })
  if (error) return { message: "The template draft could not be created." }
  revalidatePath(`/yachts/${validId.data}/commercial`)
  return { message: "New template version created as a draft.", success: true }
}

export async function approveOfferTemplateAction(
  yachtId: string,
  templateId: string,
): Promise<void> {
  const yacht = idSchema.safeParse(yachtId)
  const template = idSchema.safeParse(templateId)
  if (!yacht.success || !template.success) return
  const context = await getAuthenticatedRequestContext()
  if (!context) return
  await context.supabase.rpc("approve_yacht_offer_template", {
    p_template_id: template.data,
  })
  revalidatePath(`/yachts/${yacht.data}/commercial`)
  revalidatePath("/offers/new")
}

export async function createOfferDraftAction(
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const parsed = parseOfferDraftFormData(formData)
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase.rpc("create_offer_draft", {
    p_enquiry_id: parsed.data.enquiry_id,
    p_template_version_id: parsed.data.template_version_id,
    p_rate_period_id: parsed.data.rate_period_id,
    p_source_offer_id: parsed.data.source_offer_id as unknown as string,
    p_recipient_name: parsed.data.recipient_name,
    p_subject_snapshot: parsed.data.subject_snapshot,
    p_body_snapshot: parsed.data.body_snapshot,
    p_proposed_charter_fee: parsed.data.proposed_charter_fee,
  })
  if (error || !data) {
    return { message: "The offer draft could not be created. Refresh the source data and try again." }
  }

  revalidatePath("/offers")
  revalidatePath(`/enquiries/${parsed.data.enquiry_id}`)
  redirect(`/offers/${data.id}?created=1`)
}

export async function updateOfferDraftAction(
  offerId: string,
  _previousState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const validId = idSchema.safeParse(offerId)
  const parsed = parseOfferDraftFormData(formData)
  if (!validId.success) return { message: "The offer reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.rpc("update_offer_draft", {
    p_offer_id: validId.data,
    p_recipient_name: parsed.data.recipient_name,
    p_subject_snapshot: parsed.data.subject_snapshot,
    p_body_snapshot: parsed.data.body_snapshot,
    p_proposed_charter_fee: parsed.data.proposed_charter_fee,
  })
  if (error) return { message: "Only the latest unlocked draft can be edited." }
  revalidatePath("/offers")
  revalidatePath(`/offers/${validId.data}`)
  redirect(`/offers/${validId.data}?updated=1`)
}

async function transitionOffer(
  offerId: string,
  formData: FormData,
  command: "approve_offer" | "mark_offer_sent",
) {
  const validId = idSchema.safeParse(offerId)
  const parsed = parseOfferTransitionFormData(formData)
  if (!validId.success) return { message: "The offer reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase.rpc(command, {
    p_offer_id: validId.data,
    p_reason: command === "approve_offer" ? "Offer reviewed and approved" : "Offer marked as sent",
  })
  if (error || !data) return { message: "The offer changed elsewhere. Refresh and review it." }
  revalidatePath("/offers")
  revalidatePath(`/offers/${validId.data}`)
  revalidatePath(`/enquiries/${data.enquiry_id}`)
  revalidatePath("/enquiries")
  revalidatePath("/")
  return {
    message: command === "approve_offer"
      ? "Offer approved and locked."
      : "Offer marked as sent.",
    success: true,
  }
}

export async function approveOfferAction(
  offerId: string,
  _previousState: OfferActionState,
  formData: FormData,
) {
  return transitionOffer(offerId, formData, "approve_offer")
}

export async function markOfferSentAction(
  offerId: string,
  _previousState: OfferActionState,
  formData: FormData,
) {
  return transitionOffer(offerId, formData, "mark_offer_sent")
}
