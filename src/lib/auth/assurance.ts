type VerifiedClaims = {
  aal?: unknown
}

export type AssuranceLevel = "aal1" | "aal2" | null

/**
 * Read the assurance level only from claims that Supabase has already verified.
 * This avoids trusting the cookie-backed user object returned by getSession().
 */
export function assuranceLevelFromVerifiedClaims(claims: VerifiedClaims | null | undefined): AssuranceLevel {
  return claims?.aal === "aal2" ? "aal2" : claims?.aal === "aal1" ? "aal1" : null
}
