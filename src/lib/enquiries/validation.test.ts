import { describe, expect, it } from "vitest"

import { canTransitionEnquiry } from "./state-machine"
import {
  enquiryNoteSchema,
  enquirySchema,
  enquiryTransitionSchema,
} from "./validation"

const customerId = "42000000-0000-4000-8000-000000000001"

function validEnquiry(overrides: Record<string, unknown> = {}) {
  return {
    customer_contact_id: customerId,
    broker_contact_id: null,
    broker_company_id: null,
    requested_yacht_id: null,
    owner_user_id: null,
    summary: "Synthetic charter request",
    priority: "normal",
    charter_start_date: null,
    charter_end_date: null,
    guest_count: null,
    embarkation_port: null,
    disembarkation_port: null,
    budget_amount: null,
    currency: null,
    ...overrides,
  }
}

describe("enquiry validation", () => {
  it("accepts a minimal linked enquiry", () => {
    expect(enquirySchema.safeParse(validEnquiry()).success).toBe(true)
  })

  it("accepts a broker company when the customer is not yet known", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({
        customer_contact_id: null,
        broker_company_id: "32000000-0000-4000-8000-000000000001",
      }),
    )
    expect(parsed.success).toBe(true)
  })

  it("requires at least one requester identity", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({ customer_contact_id: null }),
    )
    expect(parsed.success).toBe(false)
  })

  it("requires charter dates as a pair", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({ charter_start_date: "2026-08-01" }),
    )
    expect(parsed.success).toBe(false)
  })

  it("rejects a charter end before its start", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({
        charter_start_date: "2026-08-08",
        charter_end_date: "2026-08-01",
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it("normalises currency and accepts a complete budget", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({ budget_amount: "180000", currency: " eur " }),
    )
    expect(parsed.success && parsed.data.currency).toBe("EUR")
  })

  it("normalises blank optional values to null", () => {
    const parsed = enquirySchema.safeParse(
      validEnquiry({ guest_count: "", embarkation_port: "" }),
    )
    expect(parsed.success && parsed.data.guest_count).toBeNull()
    expect(parsed.success && parsed.data.embarkation_port).toBeNull()
  })

  it("trims append-only notes", () => {
    const parsed = enquiryNoteSchema.safeParse({
      kind: "requirement",
      body: "  Needs child-friendly water toys.  ",
    })
    expect(parsed.success && parsed.data.body).toBe("Needs child-friendly water toys.")
  })

  it("requires a reason for state transitions", () => {
    expect(
      enquiryTransitionSchema.safeParse({ new_status: "offer_sent", reason: "" })
        .success,
    ).toBe(false)
  })

  it("does not permit Phase 4 to move awaiting signatures directly to booked", () => {
    expect(canTransitionEnquiry("awaiting_signatures", "booked")).toBe(false)
  })
})
