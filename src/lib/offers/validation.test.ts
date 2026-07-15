import { describe, expect, it } from "vitest"

import {
  commercialProfileSchema,
  offerTemplateSchema,
  salesMaterialSchema,
} from "./validation"

describe("commercial and offer validation", () => {
  it("normalises profile features and currency", () => {
    const result = commercialProfileSchema.parse({
      overview: "Synthetic profile",
      port_guidance: "Athens preferred",
      fuel_consumption_lph: "210",
      fuel_consumption_speed_knots: "12",
      short_charter_divisor: "6",
      default_currency: "eur",
      default_tax_rate: "5",
      key_features: "Feature one\n\n Feature two ",
      reference_notes: "Synthetic references",
    })
    expect(result.default_currency).toBe("EUR")
    expect(result.key_features).toEqual(["Feature one", "Feature two"])
  })

  it("requires paired fuel figures", () => {
    const result = commercialProfileSchema.safeParse({
      overview: "Synthetic profile",
      port_guidance: "",
      fuel_consumption_lph: "210",
      fuel_consumption_speed_knots: "",
      short_charter_divisor: "6",
      default_currency: "EUR",
      default_tax_rate: "5",
      key_features: "",
      reference_notes: "",
    })
    expect(result.success).toBe(false)
  })

  it("requires HTTPS public sales-material links", () => {
    expect(salesMaterialSchema.safeParse({
      yacht_id: "23000000-0000-4000-8000-000000000001",
      material_type: "brochure",
      label: "Synthetic brochure",
      public_url: "http://example.test/file",
      approved_for_offers: true,
      sort_order: 10,
    }).success).toBe(false)
  })

  it("rejects unknown offer placeholders", () => {
    expect(offerTemplateSchema.safeParse({
      yacht_id: "23000000-0000-4000-8000-000000000001",
      name: "Synthetic response",
      subject_template: "{{yacht_name}} offer",
      body_template: "This is long enough but includes {{untrusted_value}}.",
    }).success).toBe(false)
  })
})
