import { describe, expect, it } from "vitest"

import {
  normaliseDirectorySearch,
  parseCompanyAssignment,
  parseCompanyFormData,
  parseContactFormData,
  parseYachtAssignment,
} from "./validation"

function validContactForm() {
  const formData = new FormData()
  formData.set("full_name", "  Sofia Example  ")
  formData.set("email", " SOFIA@EXAMPLE.TEST ")
  formData.set("phone", "+44 1632 960099")
  formData.append("roles", "broker")
  formData.append("roles", "customer")
  formData.set("active", "true")
  formData.set("notes", " Synthetic contact ")
  return formData
}

describe("contact directory validation", () => {
  it("normalises a contact with multiple roles", () => {
    const result = parseContactFormData(validContactForm())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.full_name).toBe("Sofia Example")
      expect(result.data.email).toBe("sofia@example.test")
      expect(result.data.roles).toEqual(["broker", "customer"])
    }
  })

  it("deduplicates repeated contact roles", () => {
    const formData = validContactForm()
    formData.append("roles", "broker")

    const result = parseContactFormData(formData)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.roles).toEqual(["broker", "customer"])
  })

  it("requires at least one contact role", () => {
    const formData = validContactForm()
    formData.delete("roles")

    const result = parseContactFormData(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.roles).toContain(
        "Select at least one role.",
      )
    }
  })

  it("rejects non-web company URL schemes", () => {
    const formData = new FormData()
    formData.set("name", "Synthetic Company")
    formData.set("website", "javascript:alert(1)")
    formData.set("active", "true")

    expect(parseCompanyFormData(formData).success).toBe(false)
  })

  it("parses primary company assignments", () => {
    const formData = new FormData()
    formData.set("company_id", "30000000-0000-4000-8000-000000000001")
    formData.set("job_title", " Charter broker ")
    formData.set("is_primary", "on")

    const result = parseCompanyAssignment(formData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.job_title).toBe("Charter broker")
      expect(result.data.is_primary).toBe(true)
    }
  })

  it("parses yacht notification responsibility flags", () => {
    const formData = new FormData()
    formData.set("yacht_id", "20000000-0000-4000-8000-000000000001")
    formData.set("responsibility", "captain")
    formData.set("notifications_enabled", "on")

    const result = parseYachtAssignment(formData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notifications_enabled).toBe(true)
      expect(result.data.is_primary).toBe(false)
    }
  })

  it("normalises directory search without retaining control characters", () => {
    expect(normaliseDirectorySearch("  SOFIA\u0000   MERCER  ")).toBe(
      "sofia mercer",
    )
  })
})
