import { timingSafeEqual } from "node:crypto"

export function setupTokenMatches(submittedToken: string, configuredToken: string | undefined) {
  const expected = configuredToken?.trim()
  const submitted = submittedToken.trim()
  if (!expected || expected.length < 32 || submitted.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))
}

export function deriveInitialSetupStatus(profileCount: number, configuredToken: string | undefined) {
  if (profileCount > 0) return { available: false, reason: "already_claimed" as const }
  if (!configuredToken?.trim() || configuredToken.trim().length < 32) {
    return { available: false, reason: "not_configured" as const }
  }
  return { available: true, reason: null }
}
