import { describe, expect, it } from "vitest"

import {
  emailClassificationSchema,
  gmailIngestionSchema,
  operationalSettingsSchema,
} from "./validation"

describe("Phase 9 email validation", () => {
  it("accepts a bounded Gmail adapter payload", () => {
    expect(gmailIngestionSchema.safeParse({
      provider_event_id: "event-1",
      provider_message_id: "message-1",
      provider_thread_id: "thread-1",
      received_at: "2026-07-16T10:00:00Z",
      recipient_emails: ["ops@example.test"],
      sender_email: "broker@example.test",
      subject: "Charter request",
    }).success).toBe(true)
  })

  it("requires a summary for a new enquiry while allowing sender-contact creation", () => {
    expect(emailClassificationSchema.safeParse({
      classification: "new_enquiry",
      contactId: "",
      enquiryId: "",
      enquirySummary: "",
      messageId: "00000000-0000-4000-8000-000000000001",
    }).success).toBe(false)
  })

  it("normalises configured internal domains", () => {
    const result = operationalSettingsSchema.parse({
      enquiryTimeoutEnabled: "on",
      internalEmailDomains: " Internal.Example.Test, ops.example.test ",
      negotiatingTimeoutDays: "45",
      newEnquiryTimeoutDays: "14",
      offerSentTimeoutDays: "30",
      waitingReplyTimeoutDays: "30",
    })
    expect(result.internalEmailDomains).toEqual(["internal.example.test", "ops.example.test"])
  })
})
