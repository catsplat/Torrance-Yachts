import { describe, expect, it } from "vitest"

import {
  internalUserUpdateSchema,
  passwordUpdateSchema,
} from "./validation"

describe("internal user validation", () => {
  it("accepts a reviewed staff update", () => {
    expect(internalUserUpdateSchema.safeParse({
      active: "true",
      displayName: "Synthetic Staff",
      phone: "+44000000001",
      reason: "Contact route reviewed",
      role: "staff",
      telegramChatId: "200000001",
      userId: "20000000-0000-4000-8000-000000000001",
    }).success).toBe(true)
  })

  it("requires a strong matching password", () => {
    expect(passwordUpdateSchema.safeParse({
      confirmPassword: "Strong!Synthetic2026",
      password: "Strong!Synthetic2026",
    }).success).toBe(true)
    expect(passwordUpdateSchema.safeParse({
      confirmPassword: "weak",
      password: "weak",
    }).success).toBe(false)
  })
})
