"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { canTransitionEnquiry } from "@/lib/enquiries/state-machine"
import {
  parseEnquiryFormData,
  parseEnquiryNoteFormData,
  parseEnquiryTransitionFormData,
} from "@/lib/enquiries/validation"
import type { Enums } from "@/types/database"

export type EnquiryActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const idSchema = z.uuid()
const expiredMessage = "Your session has expired. Sign in again."

function validationState(error: z.ZodError): EnquiryActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Review the highlighted fields.",
  }
}

export async function createEnquiryAction(
  _previousState: EnquiryActionState,
  formData: FormData,
): Promise<EnquiryActionState> {
  const parsed = parseEnquiryFormData(formData)
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("enquiries")
    .insert({
      ...parsed.data,
      owner_user_id: parsed.data.owner_user_id ?? context.userId,
      source: "manual",
    })
    .select("id")
    .single()

  if (error || !data) {
    return { message: "The enquiry could not be created. Check the fields and try again." }
  }

  revalidatePath("/enquiries")
  revalidatePath("/")
  redirect(`/enquiries/${data.id}?created=1`)
}

export async function updateEnquiryAction(
  enquiryId: string,
  _previousState: EnquiryActionState,
  formData: FormData,
): Promise<EnquiryActionState> {
  const validId = idSchema.safeParse(enquiryId)
  const parsed = parseEnquiryFormData(formData)
  if (!validId.success) return { message: "The enquiry reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("enquiries")
    .update(parsed.data)
    .eq("id", validId.data)
    .select("id")
    .single()

  if (error || !data) {
    return { message: "The enquiry could not be updated. Check the fields and try again." }
  }

  revalidatePath("/enquiries")
  revalidatePath(`/enquiries/${validId.data}`)
  revalidatePath("/")
  redirect(`/enquiries/${validId.data}?updated=1`)
}

export async function addEnquiryNoteAction(
  enquiryId: string,
  _previousState: EnquiryActionState,
  formData: FormData,
): Promise<EnquiryActionState> {
  const validId = idSchema.safeParse(enquiryId)
  const parsed = parseEnquiryNoteFormData(formData)
  if (!validId.success) return { message: "The enquiry reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.from("enquiry_notes").insert({
    enquiry_id: validId.data,
    ...parsed.data,
  })

  if (error) return { message: "The note could not be added." }

  revalidatePath(`/enquiries/${validId.data}`)
  return { message: "Note added to the permanent history.", success: true }
}

export async function transitionEnquiryAction(
  enquiryId: string,
  currentStatus: Enums<"enquiry_status">,
  _previousState: EnquiryActionState,
  formData: FormData,
): Promise<EnquiryActionState> {
  const validId = idSchema.safeParse(enquiryId)
  const parsed = parseEnquiryTransitionFormData(formData)
  if (!validId.success) return { message: "The enquiry reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  if (!canTransitionEnquiry(currentStatus, parsed.data.new_status)) {
    return { message: "That transition is not available from the current state." }
  }

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.rpc("transition_enquiry_status", {
    p_enquiry_id: validId.data,
    p_new_status: parsed.data.new_status,
    p_reason: `Status changed from ${currentStatus.replaceAll("_", " ")} to ${parsed.data.new_status.replaceAll("_", " ")}`,
  })

  if (error) {
    return {
      message: error.message.includes("Invalid enquiry status transition")
        ? "The enquiry changed elsewhere. Refresh and review its current state."
        : "The status could not be changed.",
    }
  }

  revalidatePath("/enquiries")
  revalidatePath(`/enquiries/${validId.data}`)
  revalidatePath("/")
  return { message: "Enquiry status updated and recorded.", success: true }
}
