import { describe, expect, it } from "vitest"

import {
  backupVerificationSchema,
  launchCheckReviewSchema,
  tutorialAdvanceSchema,
} from "./validation"

describe("Phase 12 validation", () => {
  it("accepts a bounded tutorial transition", () => {
    expect(tutorialAdvanceSchema.safeParse({
      eventType: "email_classified",
      practiceStage: "classified",
      step: 1,
    }).success).toBe(true)
  })

  it("requires evidence for launch approval", () => {
    expect(launchCheckReviewSchema.safeParse({
      checkKey: "domain_and_tls",
      evidence: "",
      reason: "Reviewed",
      status: "passed",
    }).success).toBe(false)
  })

  it("requires restore evidence for a passed backup", () => {
    expect(backupVerificationSchema.safeParse({
      artifactReference: "backup-2026-07-16",
      checksumSha256: "",
      completedAt: "2026-07-16T12:00:00.000Z",
      environment: "development",
      notes: "Restore drill",
      restoreTestedAt: "",
      scope: "full",
      startedAt: "2026-07-16T11:50:00.000Z",
      status: "passed",
    }).success).toBe(false)
  })
})
