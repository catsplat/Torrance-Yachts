import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  displayName: string
  id: string
  role: "administrator" | "staff"
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data: verifiedToken } = await supabase.auth.getClaims()
  const userId = verifiedToken?.claims?.sub

  if (!userId) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, active")
    .eq("id", userId)
    .single()

  if (!profile?.active) return null

  return {
    displayName: profile.display_name,
    id: userId,
    role: profile.role,
  }
})
