import { describe, expect, it } from "vitest"

import { taskDueState } from "./options"
import {
  adHocTaskSchema,
  taskScheduleSchema,
  templateStepSchema,
} from "./validation"

describe("task validation", () => {
  it("normalises an empty optional schedule", () => {
    expect(taskScheduleSchema.parse({
      due_date: "",
      assigned_user_id: "",
      priority: "high",
      reason: "Reviewed operational schedule",
    })).toMatchObject({
      due_date: null,
      assigned_user_id: null,
      priority: "high",
    })
  })

  it("requires a date source when the template requires a due date", () => {
    expect(templateStepSchema.safeParse({
      title: "Payment check",
      description: "",
      priority: "urgent",
      required: "on",
      due_anchor: "none",
      due_offset_days: "0",
      due_date_required: "on",
      reminder_lead_days: "",
      escalation_after_days: "",
    }).success).toBe(false)
  })

  it("accepts a bounded ad-hoc task", () => {
    expect(adHocTaskSchema.safeParse({
      booking_id: "70000000-0000-4000-8000-000000000001",
      title: "Confirm synthetic transfer",
      description: "",
      due_date: "2026-08-01",
      priority: "normal",
      assigned_user_id: "",
    }).success).toBe(true)
  })
})

describe("task due state", () => {
  it("ignores completed tasks", () => {
    expect(taskDueState("2000-01-01", "completed")).toBe("none")
  })

  it("marks an old open task overdue", () => {
    expect(taskDueState("2000-01-01", "ready")).toBe("overdue")
  })
})
