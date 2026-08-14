import { describe, expect, it } from "vitest"

import { isTauriDesktopUserAgent } from "./desktop-client"

describe("Tauri desktop user-agent detection", () => {
  it("identifies only the fixed companion user agent", () => {
    expect(isTauriDesktopUserAgent("TorranceYachtsDesktop/0.19.1")).toBe(true)
    expect(isTauriDesktopUserAgent("Mozilla/5.0")).toBe(false)
    expect(isTauriDesktopUserAgent(null)).toBe(false)
  })
})
