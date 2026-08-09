import { describe, expect, it } from "vitest"

import { failedAuthCallbackPath, safeAuthNextPath } from "./callback-routing"

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
})

