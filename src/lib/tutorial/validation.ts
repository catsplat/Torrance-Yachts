import { z } from "zod"

export const tutorialPracticeStageSchema = z.enum([
  "email_received",
  "classified",
  "enquiry_created",
  "offer_prepared",
  "contract_reviewed",
  "booking_confirmed",
  "compliance_completed",
  "operations_ready",
  "charter_active",
  "charter_completed",
  "follow_up_completed",
])

export const tutorialAdvanceSchema = z.object({
  eventType: z.string().trim().regex(/^[a-z][a-z0-9_]{1,79}$/),
  practiceStage: tutorialPracticeStageSchema,
  step: z.coerce.number().int().min(0).max(11),
})

export const launchCheckReviewSchema = z.object({
  checkKey: z.string().trim().regex(/^[a-z][a-z0-9_]{2,79}$/),
  evidence: z.string().trim().max(4000),
  reason: z.string().trim().min(2).max(2000),
  status: z.enum(["pending", "passed", "waived"]),
}).refine((value) => value.status === "pending" || value.evidence.length >= 2, {
  message: "Passed or waived checks require evidence.",
  path: ["evidence"],
})

export const backupVerificationSchema = z.object({
  artifactReference: z.string().trim().max(500),
  checksumSha256: z.union([z.literal(""), z.string().trim().toLowerCase().regex(/^[0-9a-f]{64}$/)]),
  completedAt: z.iso.datetime(),
  environment: z.enum(["development", "staging", "production"]),
  notes: z.string().trim().min(2).max(4000),
  restoreTestedAt: z.union([z.literal(""), z.iso.datetime()]),
  scope: z.enum(["database", "storage", "full"]),
  startedAt: z.iso.datetime(),
  status: z.enum(["started", "passed", "failed"]),
}).refine(
  (value) => value.status !== "passed" ||
    Boolean(value.checksumSha256 && value.restoreTestedAt),
  {
    message: "Successful verification requires a checksum and restore time.",
    path: ["checksumSha256"],
  },
)
