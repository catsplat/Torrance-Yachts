import type { Enums } from "@/types/database"

export const documentTypeValues = [
  "charter_agreement",
  "broker_kyc_statement",
  "client_passport",
  "cdd_check",
  "kylian_commission_invoice",
  "broker_commission_invoice",
  "other",
] as const

export const documentTypeLabels: Record<Enums<"document_type">, string> = {
  charter_agreement: "Signed charter agreement",
  broker_kyc_statement: "Broker KYC statement",
  client_passport: "Client passport",
  cdd_check: "CDD / passport check",
  kylian_commission_invoice: "Kylian commission invoice",
  broker_commission_invoice: "Broker commission invoice",
  other: "Other booking document",
}

export const documentScanStatusValues = [
  "pending",
  "scanning",
  "clean",
  "infected",
  "error",
  "released",
] as const

export const documentScanStatusLabels: Record<Enums<"document_scan_status">, string> = {
  pending: "Pending scan",
  scanning: "Scanning",
  clean: "Clean",
  infected: "Rejected",
  error: "Scan failed",
  released: "Released",
}

export const documentVerificationStatusValues = [
  "pending_review",
  "verified",
  "rejected",
] as const

export const documentVerificationStatusLabels: Record<Enums<"document_verification_status">, string> = {
  pending_review: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
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
