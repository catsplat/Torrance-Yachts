import { describe, expect, it } from "vitest"

import { assuranceLevelFromVerifiedClaims } from "./assurance"

describe("assuranceLevelFromVerifiedClaims", () => {
  it("accepts supported verified assurance levels", () => {
    expect(assuranceLevelFromVerifiedClaims({ aal: "aal1" })).toBe("aal1")
    expect(assuranceLevelFromVerifiedClaims({ aal: "aal2" })).toBe("aal2")
  })

  it("rejects absent and unexpected claim values", () => {
    expect(assuranceLevelFromVerifiedClaims(undefined)).toBeNull()
    expect(assuranceLevelFromVerifiedClaims({ aal: "aal3" })).toBeNull()
    expect(assuranceLevelFromVerifiedClaims({ aal: 2 })).toBeNull()
  })
})
