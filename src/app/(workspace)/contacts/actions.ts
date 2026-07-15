"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  parseCompanyAssignment,
  parseCompanyFormData,
  parseContactFormData,
  parseYachtAssignment,
} from "@/lib/contacts/validation"

export type DirectoryActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
}

const expiredMessage = "Your session has expired. Sign in again."
const genericContactError = "The contact could not be saved. Check the fields and try again."
const genericCompanyError = "The company could not be saved. Check the fields and try again."
const idSchema = z.uuid()

function validationState(error: z.ZodError): DirectoryActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Review the highlighted fields.",
  }
}

export async function createContactAction(
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const parsed = parseContactFormData(formData)
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("contacts")
    .insert(parsed.data)
    .select("id")
    .single()

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "A contact with this email address already exists."
          : genericContactError,
    }
  }

  revalidatePath("/contacts")
  redirect(`/contacts/${data.id}?created=1`)
}

export async function updateContactAction(
  contactId: string,
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const validId = idSchema.safeParse(contactId)
  const parsed = parseContactFormData(formData)

  if (!validId.success) return { message: "The contact reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("contacts")
    .update(parsed.data)
    .eq("id", validId.data)
    .select("id")
    .single()

  if (error || !data) {
    return {
      message:
        error?.code === "23505"
          ? "A contact with this email address already exists."
          : genericContactError,
    }
  }

  revalidatePath("/contacts")
  revalidatePath(`/contacts/${validId.data}`)
  revalidatePath("/yachts")
  redirect(`/contacts/${validId.data}?updated=1`)
}

export async function createCompanyAction(
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const parsed = parseCompanyFormData(formData)
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("companies")
    .insert(parsed.data)
    .select("id")
    .single()

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "A company with this name already exists."
          : genericCompanyError,
    }
  }

  revalidatePath("/contacts/companies")
  redirect(`/contacts/companies/${data.id}?created=1`)
}

export async function updateCompanyAction(
  companyId: string,
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const validId = idSchema.safeParse(companyId)
  const parsed = parseCompanyFormData(formData)

  if (!validId.success) return { message: "The company reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { data, error } = await context.supabase
    .from("companies")
    .update(parsed.data)
    .eq("id", validId.data)
    .select("id")
    .single()

  if (error || !data) {
    return {
      message:
        error?.code === "23505"
          ? "A company with this name already exists."
          : genericCompanyError,
    }
  }

  revalidatePath("/contacts")
  revalidatePath("/contacts/companies")
  revalidatePath(`/contacts/companies/${validId.data}`)
  redirect(`/contacts/companies/${validId.data}?updated=1`)
}

export async function assignCompanyAction(
  contactId: string,
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const validContactId = idSchema.safeParse(contactId)
  const parsed = parseCompanyAssignment(formData)

  if (!validContactId.success) return { message: "The contact reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.from("company_contacts").insert({
    contact_id: validContactId.data,
    ...parsed.data,
  })

  if (error) {
    const primaryConflict = error.message.includes("one_primary_company")
    return {
      message: primaryConflict
        ? "This contact already has a primary company."
        : error.code === "23505"
          ? "This contact is already linked to that company."
          : "The company relationship could not be saved.",
    }
  }

  revalidatePath(`/contacts/${validContactId.data}`)
  revalidatePath("/contacts/companies")
  return { message: "Company relationship added." }
}

export async function removeCompanyAssignmentAction(
  assignmentId: string,
  contactId: string,
) {
  const validAssignmentId = idSchema.safeParse(assignmentId)
  const validContactId = idSchema.safeParse(contactId)
  if (!validAssignmentId.success || !validContactId.success) return

  const context = await getAuthenticatedRequestContext()
  if (!context) return

  await context.supabase
    .from("company_contacts")
    .delete()
    .eq("id", validAssignmentId.data)
    .eq("contact_id", validContactId.data)

  revalidatePath(`/contacts/${validContactId.data}`)
  revalidatePath("/contacts/companies")
}

export async function assignYachtAction(
  contactId: string,
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const validContactId = idSchema.safeParse(contactId)
  const parsed = parseYachtAssignment(formData)

  if (!validContactId.success) return { message: "The contact reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)

  const context = await getAuthenticatedRequestContext()
  if (!context) return { message: expiredMessage }

  const { error } = await context.supabase.from("yacht_contacts").insert({
    contact_id: validContactId.data,
    ...parsed.data,
  })

  if (error) {
    const primaryConflict = error.message.includes("one_primary_responsibility")
    return {
      message: primaryConflict
        ? "That yacht already has a primary contact for this responsibility."
        : error.code === "23505"
          ? "This yacht responsibility is already assigned to the contact."
          : "The yacht relationship could not be saved.",
    }
  }

  revalidatePath(`/contacts/${validContactId.data}`)
  revalidatePath("/yachts")
  return { message: "Yacht responsibility added." }
}

export async function removeYachtAssignmentAction(
  assignmentId: string,
  contactId: string,
) {
  const validAssignmentId = idSchema.safeParse(assignmentId)
  const validContactId = idSchema.safeParse(contactId)
  if (!validAssignmentId.success || !validContactId.success) return

  const context = await getAuthenticatedRequestContext()
  if (!context) return

  await context.supabase
    .from("yacht_contacts")
    .delete()
    .eq("id", validAssignmentId.data)
    .eq("contact_id", validContactId.data)

  revalidatePath(`/contacts/${validContactId.data}`)
  revalidatePath("/yachts")
}
