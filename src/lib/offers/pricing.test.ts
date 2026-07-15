import { describe, expect, it } from "vitest"

import { calculateCharterDays, calculateCharterFee, formatCommercialNumber } from "./pricing"

describe("offer pricing", () => {
  it("uses the customary divisor for a charter shorter than seven days", () => {
    expect(calculateCharterFee(150000, 3, 6)).toBe(75000)
  })

  it("uses seven-day pro-rating for a week or longer", () => {
    expect(calculateCharterFee(150000, 14, 6)).toBe(300000)
  })

  it("rounds deterministically to two decimal places", () => {
    expect(calculateCharterFee(100000, 1, 6)).toBe(16666.67)
  })

  it("derives charter days from ISO dates", () => {
    expect(calculateCharterDays("2026-08-14", "2026-08-21")).toBe(7)
  })

  it("rejects invalid commercial inputs", () => {
    expect(() => calculateCharterFee(0, 7, 6)).toThrow("Weekly rate")
    expect(() => calculateCharterDays("2026-08-21", "2026-08-14")).toThrow("Charter dates")
  })

  it("formats commercial numbers consistently", () => {
    expect(formatCommercialNumber(168000)).toBe("168,000.00")
  })
})
