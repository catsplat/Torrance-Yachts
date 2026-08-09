import { describe, expect, it } from "vitest"

import {
  failedAuthCallbackPath,
  hasApprovedInternalAccess,
  safeAuthNextPath,
} from "./callback-routing"

describe("authentication callback routing", () => {
  it("accepts local paths and rejects protocol-relative redirects", () => {
    expect(safeAuthNextPath("/settings/alerts")).toBe("/settings/alerts")
    expect(safeAuthNextPath("//example.test")).toBe("/")
    expect(safeAuthNextPath("https://example.test")).toBe("/")
  })

  it("separates failed recovery links from failed OAuth sign-in", () => {
    expect(failedAuthCallbackPath("/account/update-password")).toBe("/login?recovery=invalid")
    expect(failedAuthCallbackPath("/")).toBe("/login?oauth=failed")
  })

  it("requires both administrator approval and an active profile", () => {
    expect(hasApprovedInternalAccess(null)).toBe(false)
    expect(hasApprovedInternalAccess({ access_approved_at: null, active: true })).toBe(false)
    expect(
      hasApprovedInternalAccess({ access_approved_at: "2026-08-09T12:00:00Z", active: false }),
    ).toBe(false)
    expect(
      hasApprovedInternalAccess({ access_approved_at: "2026-08-09T12:00:00Z", active: true }),
    ).toBe(true)
  })
})
