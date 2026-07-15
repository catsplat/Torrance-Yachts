import "server-only"

import { createClient } from "@/lib/supabase/server"

export async function getAuthenticatedRequestContext() {
  const supabase = await createClient()
  const { data: verifiedToken } = await supabase.auth.getClaims()
  const userId = verifiedToken?.claims?.sub

  if (!userId) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("active, role")
    .eq("id", userId)
    .single()

  if (!profile?.active) return null

  return {
    role: profile.role,
    supabase,
    userId,
  }
}
