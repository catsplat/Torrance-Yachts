import { describe, expect, it } from "vitest"

import { parseYachtFormData } from "./validation"

function validFormData() {
  const formData = new FormData()
  formData.set("name", " M/Y Test Vessel ")
  formData.set("builder", " Demo Yard ")
  formData.set("year_built", "2024")
  formData.set("length_metres", "43")
  formData.set("beam_metres", "9")
  formData.set("guest_capacity", "12")
  formData.set("cabin_count", "5")
  formData.set("crew_count", "9")
  formData.set("cruise_speed_knots", "12")
  formData.set("max_speed_knots", "16")
  formData.set("home_port", " Athens ")
  formData.set("preferred_ports", "Athens, Mykonos")
  formData.set("notification_phone", "+44 20 1234 5678")
  formData.set("status", "active")
  formData.set("notes", "Synthetic test record")
  return formData
}

describe("parseYachtFormData", () => {
  it("normalises a valid form into typed database values", () => {
    const result = parseYachtFormData(validFormData())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("M/Y Test Vessel")
      expect(result.data.length_metres).toBe(43)
      expect(result.data.preferred_ports).toEqual(["Athens", "Mykonos"])
    }
  })

  it("turns blank optional fields into undefined values", () => {
    const formData = validFormData()
    formData.set("builder", "")
    formData.set("year_built", "")

    const result = parseYachtFormData(formData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.builder).toBeUndefined()
      expect(result.data.year_built).toBeUndefined()
    }
  })

  it("rejects a maximum speed below cruising speed", () => {
    const formData = validFormData()
    formData.set("max_speed_knots", "10")

    const result = parseYachtFormData(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.max_speed_knots).toContain(
        "Maximum speed cannot be below cruising speed.",
      )
    }
  })
})
