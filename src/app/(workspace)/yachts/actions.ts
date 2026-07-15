"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { parseYachtFormData } from "@/lib/yachts/validation"

export type YachtActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
}

const initialError = "The yacht could not be saved. Check the fields and try again."

async function requireAuthenticatedClient() {
  const supabase = await createClient()
  const { data: verifiedToken } = await supabase.auth.getClaims()
  const claims = verifiedToken?.claims

  return claims?.sub ? supabase : null
}

export async function createYachtAction(
  _previousState: YachtActionState,
  formData: FormData,
): Promise<YachtActionState> {
  const parsed = parseYachtFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Review the highlighted fields.",
    }
  }

  const supabase = await requireAuthenticatedClient()
  if (!supabase) return { message: "Your session has expired. Sign in again." }

  const { data, error } = await supabase
    .from("yachts")
    .insert(parsed.data)
    .select("id")
    .single()

  if (error) {
    return {
      message:
        error.code === "23505"
          ? "A yacht with this name already exists."
          : initialError,
    }
  }

  revalidatePath("/yachts")
  redirect(`/yachts/${data.id}?created=1`)
}

export async function updateYachtAction(
  yachtId: string,
  _previousState: YachtActionState,
  formData: FormData,
): Promise<YachtActionState> {
  const parsed = parseYachtFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Review the highlighted fields.",
    }
  }

  const supabase = await requireAuthenticatedClient()
  if (!supabase) return { message: "Your session has expired. Sign in again." }

  const { data, error } = await supabase
    .from("yachts")
    .update(parsed.data)
    .eq("id", yachtId)
    .select("id")
    .single()

  if (error || !data) {
    return {
      message:
        error?.code === "23505"
          ? "A yacht with this name already exists."
          : initialError,
    }
  }

  revalidatePath("/yachts")
  revalidatePath(`/yachts/${yachtId}`)
  redirect(`/yachts/${yachtId}?updated=1`)
}
