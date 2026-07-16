"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { passwordUpdateSchema } from "@/lib/users/validation"

export type PasswordActionState = { message?: string }

export async function updatePasswordAction(
  _state: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = passwordUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Review the password." }
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) return { message: "The recovery session has expired. Request a new email." }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { message: "The password could not be changed. Request a new recovery email." }
  await supabase.auth.signOut()
  redirect("/login?recovery=complete")
}
