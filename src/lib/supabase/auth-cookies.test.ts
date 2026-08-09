import { describe, expect, it } from "vitest"

import { isSupabaseAuthCookie } from "./auth-cookies"

describe("isSupabaseAuthCookie", () => {
  it.each([
    "sb-local-auth-token",
    "sb-local-auth-token.0",
    "sb-project-ref-auth-token.12",
    "sb-project-ref-auth-token-code-verifier",
  ])("recognises Supabase session cookie %s", (name) => {
    expect(isSupabaseAuthCookie(name)).toBe(true)
  })

  it.each([
    "theme",
    "sidebar_state",
    "auth-token",
    "sb-project-preferences",
  ])("leaves unrelated cookie %s alone", (name) => {
    expect(isSupabaseAuthCookie(name)).toBe(false)
  })
})
