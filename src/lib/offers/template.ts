export const offerTemplatePlaceholderValues = [
  "customer_name",
  "yacht_name",
  "weekly_rate",
  "proposed_charter_fee",
  "currency",
  "tax_rate",
  "charter_start_date",
  "charter_end_date",
  "guest_count",
  "embarkation_port",
  "disembarkation_port",
  "port_guidance",
  "yacht_overview",
  "yacht_specifications",
  "key_features",
  "sales_materials",
  "references",
] as const

export type OfferTemplatePlaceholder = typeof offerTemplatePlaceholderValues[number]
export type OfferTemplateValues = Record<OfferTemplatePlaceholder, string>

const placeholderPattern = /\{\{([a-z_]+)\}\}/g
const allowedPlaceholders = new Set<string>(offerTemplatePlaceholderValues)

export function findUnknownOfferPlaceholders(template: string) {
  return [...template.matchAll(placeholderPattern)]
    .map((match) => match[1])
    .filter((placeholder, index, values) => (
      !allowedPlaceholders.has(placeholder) && values.indexOf(placeholder) === index
    ))
}

export function renderOfferTemplate(template: string, values: OfferTemplateValues) {
  const unknown = findUnknownOfferPlaceholders(template)
  if (unknown.length) {
    throw new Error(`Unknown offer template placeholder: ${unknown.join(", ")}`)
  }

  return template.replace(placeholderPattern, (_token, placeholder: OfferTemplatePlaceholder) => (
    values[placeholder]
  ))
}

export function bulletList(values: string[], emptyLabel = "Not recorded") {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : emptyLabel
}
