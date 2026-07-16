import { describe, expect, it } from "vitest"

import { bookingConfirmationSchema, bufferedReservationDates } from "./validation"

const validBooking = {
  enquiry_id: "70000000-0000-4000-8000-000000000001",
  source_offer_id: "90000000-0000-4000-8000-000000000001",
  yacht_id: "10000000-0000-4000-8000-000000000001",
  charter_start_date: "2026-08-14",
  charter_end_date: "2026-08-21",
  embarkation_port: "Athens",
  disembarkation_port: "Athens",
  guest_count: 10,
  charter_fee: 168000,
  currency: "eur",
  tax_rate: 5,
  signed_agreement_confirmed: "on" as const,
  confirmation_reason: "Reviewed the fully signed agreement.",
}

describe("booking confirmation validation", () => {
  it("normalises reviewed booking terms", () => {
    const result = bookingConfirmationSchema.parse(validBooking)
    expect(result.currency).toBe("EUR")
  })

  it("requires explicit signature confirmation", () => {
    expect(bookingConfirmationSchema.safeParse({
      ...validBooking,
      signed_agreement_confirmed: undefined,
    }).success).toBe(false)
  })

  it("rejects a non-positive charter period", () => {
    expect(bookingConfirmationSchema.safeParse({
      ...validBooking,
      charter_end_date: validBooking.charter_start_date,
    }).success).toBe(false)
  })
})

describe("buffered reservation dates", () => {
  it("adds exactly one operational day on each side", () => {
    expect(bufferedReservationDates("2026-08-14", "2026-08-21")).toEqual({
      reservedFrom: "2026-08-13",
      reservedThrough: "2026-08-22",
    })
  })
})
