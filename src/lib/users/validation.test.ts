import { describe, expect, it } from "vitest"

import {
  initialAdministratorSetupSchema,
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

  it("accepts a complete first-administrator setup request", () => {
    expect(initialAdministratorSetupSchema.safeParse({
      confirmPassword: "Strong!Synthetic2026",
      displayName: "Initial Administrator",
      email: "initial.admin@example.test",
      password: "Strong!Synthetic2026",
      phone: "+44000000002",
      setupToken: "local-development-bootstrap-token-0123456789",
      telegramChatId: "200000002",
    }).success).toBe(true)
  })

  it("rejects contact values that violate profile database constraints", () => {
    expect(initialAdministratorSetupSchema.safeParse({
      confirmPassword: "Strong!Synthetic2026",
      displayName: "Initial Administrator",
      email: "initial.admin@example.test",
      password: "Strong!Synthetic2026",
      phone: "123",
      setupToken: "local-development-bootstrap-token-0123456789",
      telegramChatId: "",
    }).success).toBe(false)
  })
})
