import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"

export type UserTheme = "dark" | "light"

/**
 * Browser cookies are shared by anyone using the same browser profile, so
 * personal appearance preferences are always loaded for the active user.
 */
export const getCurrentTheme = cache(async (): Promise<UserTheme> => {
  const user = await getCurrentUser()
  if (!user) return "light"

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_ui_preferences")
    .select("theme")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw new Error("Unable to load your interface preferences.")
  return data?.theme === "dark" ? "dark" : "light"
})
