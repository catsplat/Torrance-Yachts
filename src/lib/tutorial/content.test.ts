import { describe, expect, it } from "vitest"

import { getTutorialStep, tutorialSteps } from "./content"

describe("guided tutorial content", () => {
  it("covers the complete ordered workflow", () => {
    expect(tutorialSteps).toHaveLength(12)
    expect(tutorialSteps.map((step) => step.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    )
    expect(tutorialSteps[0].practiceStage).toBe("email_received")
    expect(tutorialSteps.at(-1)?.practiceStage).toBe("follow_up_completed")
    expect(tutorialSteps.at(-1)?.eventType).toBe("launch_controls_reviewed")
  })

  it("keeps every spotlight route internal", () => {
    expect(tutorialSteps.every((step) => step.route.startsWith("/"))).toBe(true)
    expect(tutorialSteps.every((step) => !step.route.startsWith("//"))).toBe(true)
  })

  it("falls back safely for unknown step numbers", () => {
    expect(getTutorialStep(999)).toEqual(tutorialSteps[0])
  })
})
