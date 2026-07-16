"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  bookingTransitionSchema,
  parseBookingAmendmentFormData,
  parseBookingConfirmationFormData,
  yachtfolioTransitionSchema,
} from "@/lib/bookings/validation"

export type BookingActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const idSchema = z.uuid()

function validationState(error: z.ZodError): BookingActionState {
  return { fieldErrors: error.flatten().fieldErrors, message: "Review the highlighted fields." }
}

export async function confirmBookingAction(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = parseBookingConfirmationFormData(formData)
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: "Your session has expired. Sign in again." }

  const { data, error } = await context.supabase.rpc("confirm_booking", {
    p_enquiry_id: parsed.data.enquiry_id,
    p_source_offer_id: parsed.data.source_offer_id,
    p_yacht_id: parsed.data.yacht_id,
    p_charter_start_date: parsed.data.charter_start_date,
    p_charter_end_date: parsed.data.charter_end_date,
    p_embarkation_port: parsed.data.embarkation_port as unknown as string,
    p_disembarkation_port: parsed.data.disembarkation_port as unknown as string,
    p_guest_count: parsed.data.guest_count as unknown as number,
    p_charter_fee: parsed.data.charter_fee,
    p_currency: parsed.data.currency,
    p_tax_rate: parsed.data.tax_rate,
    p_signed_agreement_confirmed: true,
    p_confirmation_reason: parsed.data.confirmation_reason,
  })

  if (error || !data) {
    return {
      message: error?.code === "23P01"
        ? "These buffered dates conflict with an existing yacht reservation."
        : "The booking could not be confirmed. Refresh the enquiry, offer, and availability before trying again.",
    }
  }
  revalidatePath("/")
  revalidatePath("/bookings")
  revalidatePath(`/enquiries/${parsed.data.enquiry_id}`)
  revalidatePath(`/yachts/${parsed.data.yacht_id}`)
  redirect(`/bookings/${data.id}?created=1`)
}

export async function amendBookingAction(
  bookingId: string,
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const validId = idSchema.safeParse(bookingId)
  const parsed = parseBookingAmendmentFormData(formData)
  if (!validId.success) return { message: "The booking reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: "Your session has expired. Sign in again." }
  const { error } = await context.supabase.rpc("amend_confirmed_booking", {
    p_booking_id: validId.data,
    p_yacht_id: parsed.data.yacht_id,
    p_charter_start_date: parsed.data.charter_start_date,
    p_charter_end_date: parsed.data.charter_end_date,
    p_embarkation_port: parsed.data.embarkation_port as unknown as string,
    p_disembarkation_port: parsed.data.disembarkation_port as unknown as string,
    p_guest_count: parsed.data.guest_count as unknown as number,
    p_charter_fee: parsed.data.charter_fee,
    p_currency: parsed.data.currency,
    p_tax_rate: parsed.data.tax_rate,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: error.code === "23P01" ? "The amended buffered dates conflict with another booking." : "Only a confirmed booking can be amended after review." }
  revalidatePath("/")
  revalidatePath("/bookings")
  revalidatePath("/tasks")
  revalidatePath(`/bookings/${validId.data}`)
  revalidatePath(`/bookings/${validId.data}/tasks`)
  return { message: "Booking amended, rechecked for conflicts, and audited.", success: true }
}

export async function transitionBookingAction(
  bookingId: string,
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const validId = idSchema.safeParse(bookingId)
  const parsed = bookingTransitionSchema.safeParse(Object.fromEntries(formData))
  if (!validId.success) return { message: "The booking reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: "Your session has expired. Sign in again." }
  const { error } = await context.supabase.rpc("transition_booking_status", {
    p_booking_id: validId.data,
    p_new_status: parsed.data.new_status,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "The booking changed elsewhere or this lifecycle move is not allowed." }
  revalidatePath("/")
  revalidatePath("/bookings")
  revalidatePath("/tasks")
  revalidatePath(`/bookings/${validId.data}`)
  revalidatePath(`/bookings/${validId.data}/tasks`)
  return { message: "Booking lifecycle updated and audited.", success: true }
}

export async function transitionYachtfolioAction(
  actionId: string,
  bookingId: string,
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const action = idSchema.safeParse(actionId)
  const booking = idSchema.safeParse(bookingId)
  const parsed = yachtfolioTransitionSchema.safeParse(Object.fromEntries(formData))
  if (!action.success || !booking.success) return { message: "The action reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: "Your session has expired. Sign in again." }
  const { error } = await context.supabase.rpc("set_yachtfolio_action_status", {
    p_action_id: action.data,
    p_new_status: parsed.data.new_status,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "The Yachtfolio action changed elsewhere. Refresh and review it." }
  revalidatePath("/")
  revalidatePath("/bookings")
  revalidatePath(`/bookings/${booking.data}`)
  return { message: parsed.data.new_status === "completed" ? "Yachtfolio work recorded as complete." : "Yachtfolio action reopened.", success: true }
}
