import "server-only"

import { assuranceLevelFromVerifiedClaims } from "@/lib/auth/assurance"
import { createClient } from "@/lib/supabase/server"

export async function getAuthenticatedRequestContext() {
  const supabase = await createClient()
  const { data: verifiedToken } = await supabase.auth.getClaims()
  const userId = verifiedToken?.claims?.sub

  if (!userId) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("access_approved_at, active, role")
    .eq("id", userId)
    .single()

  if (!profile?.active || !profile.access_approved_at) return null
  if (process.env.MFA_ENFORCEMENT_ENABLED !== "false") {
    if (assuranceLevelFromVerifiedClaims(verifiedToken.claims) !== "aal2") return null
  }

  return {
    role: profile.role,
    supabase,
    userId,
  }
}
