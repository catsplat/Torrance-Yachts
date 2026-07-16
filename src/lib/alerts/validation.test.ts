import { describe, expect, it } from "vitest"

import {
  alertPreferencesSchema,
  gmailOauthCredentialsSchema,
} from "./validation"

function preferences(overrides: Record<string, FormDataEntryValue> = {}) {
  return {
    aiSummaryEnabled: "on",
    charterEnabled: "on",
    emailEnabled: "false",
    followUpEnabled: "on",
    inAppEnabled: "on",
    integrationFailureEnabled: "on",
    internalEmailEnabled: "on",
    newEnquiryEnabled: "on",
    notificationEmail: "staff@example.test",
    paymentEnabled: "on",
    phone: "",
    reason: "Personal alert configuration",
    taskEnabled: "on",
    telegramChatId: "",
    telegramEnabled: "false",
    unknownEmailEnabled: "on",
    ...overrides,
  }
}

describe("alertPreferencesSchema", () => {
  it("accepts a safe in-app alert configuration", () => {
    expect(alertPreferencesSchema.safeParse(preferences()).success).toBe(true)
  })

  it("requires a route when Telegram is enabled", () => {
    const result = alertPreferencesSchema.safeParse(preferences({
      telegramEnabled: "on",
    }))
    expect(result.success).toBe(false)
  })

  it("keeps at least one channel enabled", () => {
    const result = alertPreferencesSchema.safeParse(preferences({
      inAppEnabled: "false",
    }))
    expect(result.success).toBe(false)
  })
})

describe("gmailOauthCredentialsSchema", () => {
  it("requires complete credential material", () => {
    const result = gmailOauthCredentialsSchema.safeParse({
      accountEmail: "staff@example.test",
      clientId: "client-id-value",
      clientSecret: "client-secret-value",
      reason: "Connect my staff mailbox",
      refreshToken: "refresh-token-value",
      scopes: "https://www.googleapis.com/auth/gmail.send",
    })
    expect(result.success).toBe(true)
  })
})
