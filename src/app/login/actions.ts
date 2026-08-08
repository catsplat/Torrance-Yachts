"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(256),
})

export type LoginState = {
  message?: string
}

export async function googleLoginAction() {
  if (process.env.GOOGLE_SIGN_IN_ENABLED !== "true") redirect("/login?oauth=not-configured")
  const supabase = await createClient()
  const applicationBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: { redirectTo: `${applicationBaseUrl}/auth/callback?next=/` },
    provider: "google",
  })
  if (error || !data.url) redirect("/login?oauth=failed")
  redirect(data.url)
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { message: "Enter a valid email address and password." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { message: "The email address or password was not recognised." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .single()

  if (!profile?.active) {
    await supabase.auth.signOut()
    return { message: "This account is not active. Contact an administrator." }
  }

  redirect("/")
}
