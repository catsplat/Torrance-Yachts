export const communicationTemplatePlaceholders = {
  broker_follow_up: [
    "broker_name", "yacht_name", "charter_start_date", "charter_end_date",
  ],
  captain_contact: [
    "broker_name", "yacht_name", "captain_name", "captain_email", "captain_phone",
  ],
  kyc_request: [
    "broker_company_name", "client_name", "year", "passport_country", "residency_country",
  ],
} as const

const pattern = /\{\{([a-z_]+)\}\}/g

export function findUnknownCommunicationPlaceholders(
  kind: keyof typeof communicationTemplatePlaceholders,
  ...templates: string[]
) {
  const allowed = new Set<string>(communicationTemplatePlaceholders[kind])
  return [...templates.join("\n").matchAll(pattern)]
    .map((match) => match[1])
    .filter((value, index, values) => !allowed.has(value) && values.indexOf(value) === index)
}

export function renderCommunicationTemplate(template: string, values: Record<string, string>) {
  return template.replace(pattern, (token, placeholder: string) => values[placeholder] ?? token)
}
