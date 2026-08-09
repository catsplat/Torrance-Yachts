import "server-only"

import { cache } from "react"

import { assuranceLevelFromVerifiedClaims } from "@/lib/auth/assurance"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  accessApprovedAt: string
  assuranceLevel: "aal1" | "aal2" | null
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
    .select("access_approved_at, display_name, role, active")
    .eq("id", userId)
    .single()

  if (!profile?.active || !profile.access_approved_at) return null

  return {
    accessApprovedAt: profile.access_approved_at,
    assuranceLevel: assuranceLevelFromVerifiedClaims(verifiedToken.claims),
    displayName: profile.display_name,
    id: userId,
    role: profile.role,
  }
})

export function requiresMfa(user: CurrentUser) {
  return process.env.MFA_ENFORCEMENT_ENABLED !== "false" && user.assuranceLevel !== "aal2"
}
