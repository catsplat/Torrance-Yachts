import { describe, expect, it } from "vitest"

import { deriveInitialSetupStatus, setupTokenMatches } from "./initial-setup-token"

describe("initial administrator setup token", () => {
  const token = "local-development-bootstrap-token-0123456789"

  it("accepts an exact high-entropy configured token", () => {
    expect(setupTokenMatches(token, token)).toBe(true)
  })

  it("rejects missing, weak, and mismatched tokens", () => {
    expect(setupTokenMatches(token, undefined)).toBe(false)
    expect(setupTokenMatches("short", "short")).toBe(false)
    expect(setupTokenMatches(`${token}x`, token)).toBe(false)
    expect(setupTokenMatches(token.replace("0", "1"), token)).toBe(false)
  })
})

describe("initial administrator setup availability", () => {
  const token = "local-development-bootstrap-token-0123456789"

  it("stays closed once any profile exists, even after the token is removed", () => {
    expect(deriveInitialSetupStatus(1, undefined)).toEqual({ available: false, reason: "already_claimed" })
  })

  it("requires a strong configured token only while the installation is empty", () => {
    expect(deriveInitialSetupStatus(0, undefined)).toEqual({ available: false, reason: "not_configured" })
    expect(deriveInitialSetupStatus(0, token)).toEqual({ available: true, reason: null })
  })
})
