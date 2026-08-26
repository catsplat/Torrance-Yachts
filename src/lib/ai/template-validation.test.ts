import { describe, expect, it } from "vitest"

import { communicationTemplateDraftSchema } from "./template-validation"

describe("communication template validation", () => {
  it("accepts a blank subject for replies in existing threads", () => {
    const result = communicationTemplateDraftSchema.safeParse({
      kind: "kyc_request",
      name: "KYC request",
      subjectTemplate: "",
      bodyTemplate: "Please provide the required KYC documentation for review.",
    })
    expect(result.success).toBe(true)
  })

  it("continues to limit optional subjects", () => {
    expect(communicationTemplateDraftSchema.safeParse({
      kind: "kyc_request",
      name: "KYC request",
      subjectTemplate: "x".repeat(301),
      bodyTemplate: "Please provide the required KYC documentation for review.",
    }).success).toBe(false)
  })
})
