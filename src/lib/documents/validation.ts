import { z } from "zod"

import {
  acceptedDocumentMimeTypes,
  maxDocumentBytes,
} from "./options"

const uuid = z.string().uuid()
const requiredText = (maximum: number) =>
  z.string().trim().min(2).max(maximum)

export const documentMetadataSchema = z.object({
  bookingId: uuid,
  documentType: z.enum([
    "charter_agreement",
    "broker_kyc_statement",
    "client_passport",
    "cdd_check",
    "kylian_commission_invoice",
    "broker_commission_invoice",
    "other",
  ]),
  retentionClass: z.enum([
    "identity_sensitive",
    "booking_record",
    "financial_record",
    "sales_material",
  ]),
  title: requiredText(180),
})

const pdfSignature = Buffer.from("%PDF-")
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function startsWith(buffer: Buffer, signature: Buffer) {
  return buffer.subarray(0, signature.length).equals(signature)
}

function validateFileSignature(file: File, buffer: Buffer) {
  if (file.type === "application/pdf") {
    if (!startsWith(buffer, pdfSignature)) return "The file content is not a valid PDF."
    const sample = buffer.subarray(0, Math.min(buffer.length, 2 * 1024 * 1024)).toString("latin1")
    if (/\/Encrypt\b|\/JavaScript\b|\/JS\b|\/OpenAction\b|\/AA\b/i.test(sample)) {
      return "Encrypted or active-content PDFs are not accepted for protected document upload."
    }
    return null
  }
  if (file.type === "image/png") {
    return startsWith(buffer, pngSignature) ? null : "The file content is not a valid PNG image."
  }
  if (file.type === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      ? null
      : "The file content is not a valid JPEG image."
  }
  return "The file type is not accepted."
}

export async function validateDocumentFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return { error: "Choose a PDF, JPEG, or PNG file." } as const
  }
  if (value.size > maxDocumentBytes) {
    return { error: "The file must be 20 MB or smaller." } as const
  }
  if (
    !acceptedDocumentMimeTypes.includes(
      value.type as (typeof acceptedDocumentMimeTypes)[number],
    )
  ) {
    return { error: "Only PDF, JPEG, and PNG files are accepted." } as const
  }
  const buffer = Buffer.from(await value.arrayBuffer())
  const signatureError = validateFileSignature(value, buffer)
  if (signatureError) return { error: signatureError } as const
  return { buffer, file: value } as const
}

export const documentReviewSchema = z.object({
  approved: z.enum(["true", "false"]).transform((value) => value === "true"),
  documentId: uuid,
  reason: requiredText(2000),
})

export const requirementWaiverSchema = z.object({
  reason: requiredText(1000),
  requirementId: uuid,
})

export const contractReviewSchema = z.object({
  bookingId: uuid,
  charterEndDate: z.iso.date(),
  charterFee: z.coerce.number().positive().max(999999999999.99),
  charterStartDate: z.iso.date(),
  commissionRate: z.coerce.number().min(0).max(100),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  disembarkationPort: z.string().trim().max(120),
  embarkationPort: z.string().trim().max(120),
  reviewNotes: requiredText(3000),
  sourceDocumentId: uuid,
  taxRate: z.coerce.number().min(0).max(100),
}).refine((value) => value.charterEndDate > value.charterStartDate, {
  message: "Charter end must be after charter start.",
})

export const contractApprovalSchema = z.object({
  payment1Amount: z.coerce.number().positive(),
  payment1Date: z.iso.date(),
  payment2Amount: z.union([z.literal(""), z.coerce.number().positive()]),
  payment2Date: z.union([z.literal(""), z.iso.date()]),
  payment3Amount: z.union([z.literal(""), z.coerce.number().positive()]),
  payment3Date: z.union([z.literal(""), z.iso.date()]),
  reviewId: uuid,
}).superRefine((value, context) => {
  for (const number of [2, 3] as const) {
    const date = value[`payment${number}Date`]
    const amount = value[`payment${number}Amount`]
    if ((date === "") !== (amount === "")) {
      context.addIssue({
        code: "custom",
        message: `Instalment ${number} needs both a date and amount.`,
      })
    }
  }
})

export const paymentPaidSchema = z.object({
  paymentId: uuid,
  reason: requiredText(1000),
})
