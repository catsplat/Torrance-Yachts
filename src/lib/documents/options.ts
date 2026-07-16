import type { Enums } from "@/types/database"

export const documentTypeLabels: Record<Enums<"document_type">, string> = {
  charter_agreement: "Signed charter agreement",
  broker_kyc_statement: "Broker KYC statement",
  client_passport: "Client passport",
  cdd_check: "CDD / passport check",
  kylian_commission_invoice: "Kylian commission invoice",
  broker_commission_invoice: "Broker commission invoice",
  other: "Other booking document",
}

export const retentionClassLabels = {
  identity_sensitive: "Identity sensitive",
  booking_record: "Booking record",
  financial_record: "Financial record",
  sales_material: "Sales material",
} as const

export const acceptedDocumentMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export const maxDocumentBytes = 20 * 1024 * 1024
