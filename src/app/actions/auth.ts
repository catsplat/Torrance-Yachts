"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()

  // These are browser-scoped transient values, not sources of user identity.
  // Remove them on logout so a shared browser does not retain stale state.
  cookieStore.delete("ty-theme")
  cookieStore.set("torrance_google_oauth_pending", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/integrations/google",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  redirect("/login")
}
