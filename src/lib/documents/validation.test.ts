import { describe, expect, it } from "vitest"

import {
  contractApprovalSchema,
  contractReviewSchema,
  documentMetadataSchema,
  validateDocumentFile,
} from "./validation"

describe("Phase 8 document and payment validation", () => {
  it("accepts controlled private document metadata", () => {
    expect(documentMetadataSchema.safeParse({
      bookingId: "00000000-0000-4000-8000-000000000001",
      documentType: "client_passport",
      retentionClass: "identity_sensitive",
      title: "Client passport",
    }).success).toBe(true)
  })

  it("rejects unsupported files", async () => {
    const result = await validateDocumentFile(
      new File(["unsafe"], "unsafe.svg", { type: "image/svg+xml" }),
    )
    expect(result).toEqual({ error: "Only PDF, JPEG, and PNG files are accepted." })
  })

  it("rejects a MIME type that does not match file bytes", async () => {
    const result = await validateDocumentFile(
      new File(["not a PDF"], "misleading.pdf", { type: "application/pdf" }),
    )
    expect(result).toEqual({ error: "The file content is not a valid PDF." })
  })

  it("rejects active-content PDFs before quarantine", async () => {
    const result = await validateDocumentFile(
      new File(["%PDF-1.7\n/JavaScript (alert)"] , "active.pdf", { type: "application/pdf" }),
    )
    expect(result).toEqual({
      error: "Encrypted or active-content PDFs are not accepted for protected document upload.",
    })
  })

  it("requires valid charter dates", () => {
    expect(contractReviewSchema.safeParse({
      bookingId: "00000000-0000-4000-8000-000000000001",
      charterEndDate: "2026-08-10",
      charterFee: "100000",
      charterStartDate: "2026-08-11",
      commissionRate: "2",
      currency: "eur",
      disembarkationPort: "Athens",
      embarkationPort: "Athens",
      reviewNotes: "Compared with the signed agreement.",
      sourceDocumentId: "00000000-0000-4000-8000-000000000002",
      taxRate: "5.2",
    }).success).toBe(false)
  })

  it("requires complete optional instalments", () => {
    expect(contractApprovalSchema.safeParse({
      payment1Amount: "100000",
      payment1Date: "2026-07-01",
      payment2Amount: "50000",
      payment2Date: "",
      payment3Amount: "",
      payment3Date: "",
      reviewId: "00000000-0000-4000-8000-000000000001",
    }).success).toBe(false)
  })
})
