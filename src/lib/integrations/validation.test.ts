import { describe, expect, it } from "vitest"

import {
  deliveryClaimSchema,
  invoiceGenerationSchema,
  notificationReviewSchema,
} from "./validation"
import { developmentSimulatorWorkerId, isAllowedAutomationWorker } from "./automation-worker"

describe("Phase 11 integration validation", () => {
  it("bounds delivery claims", () => {
    expect(deliveryClaimSchema.safeParse({ limit: 20, workerId: "local-n8n" }).success).toBe(true)
    expect(deliveryClaimSchema.safeParse({
      limit: 20,
      operations: ["gmail_mark_read", "gmail_archive"],
      workerId: "gmail-actions-worker",
    }).success).toBe(true)
    expect(deliveryClaimSchema.safeParse({ limit: 20, operations: [], workerId: "local-n8n" }).success).toBe(false)
    expect(deliveryClaimSchema.safeParse({ limit: 20, operations: ["book_yacht"], workerId: "local-n8n" }).success).toBe(false)
    expect(deliveryClaimSchema.safeParse({ limit: 101, workerId: "local-n8n" }).success).toBe(false)
  })

  it("allows the synthetic delivery worker only in local development", () => {
    expect(isAllowedAutomationWorker(developmentSimulatorWorkerId, "development")).toBe(true)
    expect(isAllowedAutomationWorker(developmentSimulatorWorkerId, "staging")).toBe(false)
    expect(isAllowedAutomationWorker(developmentSimulatorWorkerId, "production")).toBe(false)
    expect(isAllowedAutomationWorker("n8n-live-adapter", "production")).toBe(true)
  })

  it("requires explicit notification review", () => {
    expect(notificationReviewSchema.safeParse({
      approved: "true",
      notificationId: "00000000-0000-4000-8000-000000000001",
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
