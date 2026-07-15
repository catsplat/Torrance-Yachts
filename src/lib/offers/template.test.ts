import { describe, expect, it } from "vitest"

import {
  bulletList,
  findUnknownOfferPlaceholders,
  offerTemplatePlaceholderValues,
  renderOfferTemplate,
  type OfferTemplateValues,
} from "./template"

const values = Object.fromEntries(
  offerTemplatePlaceholderValues.map((placeholder) => [placeholder, `[${placeholder}]`]),
) as OfferTemplateValues

describe("offer template renderer", () => {
  it("replaces only allow-listed placeholders", () => {
    expect(renderOfferTemplate("Dear {{customer_name}} — {{yacht_name}}", values))
      .toBe("Dear [customer_name] — [yacht_name]")
  })

  it("reports unknown placeholders before rendering", () => {
    expect(findUnknownOfferPlaceholders("{{unsafe}} {{unsafe}} {{yacht_name}}"))
      .toEqual(["unsafe"])
    expect(() => renderOfferTemplate("{{unsafe}}", values)).toThrow("Unknown offer template")
  })

  it("creates readable plain-text lists", () => {
    expect(bulletList(["One", "Two"])).toBe("- One\n- Two")
    expect(bulletList([])).toBe("Not recorded")
  })
})
