import { describe, expect, it } from "vitest"

import {
  deliveryClaimSchema,
  invoiceGenerationSchema,
  notificationReviewSchema,
} from "./validation"

describe("Phase 11 integration validation", () => {
  it("bounds delivery claims", () => {
    expect(deliveryClaimSchema.safeParse({ limit: 20, workerId: "local-n8n" }).success).toBe(true)
    expect(deliveryClaimSchema.safeParse({ limit: 101, workerId: "local-n8n" }).success).toBe(false)
  })

  it("requires explicit notification review", () => {
    expect(notificationReviewSchema.safeParse({
      approved: "true",
      notificationId: "00000000-0000-4000-8000-000000000001",
      reason: "Source and recipient checked",
    }).success).toBe(true)
  })

  it("accepts a controlled invoice identifier", () => {
    expect(invoiceGenerationSchema.safeParse({
      bookingId: "00000000-0000-4000-8000-000000000001",
      invoiceNumber: "16072026-1",
      invoiceProfileId: "00000000-0000-4000-8000-000000000002",
      issueDate: "2026-07-16",
      serviceDescription: "Commission service for synthetic charter",
    }).success).toBe(true)
  })
})
