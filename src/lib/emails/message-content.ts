const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi

export function emailAddressesFrom(value: unknown) {
  const discovered: string[] = []
  const collect = (candidate: unknown) => {
    if (typeof candidate === "string") {
      discovered.push(...(candidate.match(emailPattern) ?? []))
      return
    }
    if (!candidate || typeof candidate !== "object") return
    const record = candidate as Record<string, unknown>
    if (typeof record.address === "string") collect(record.address)
    if (typeof record.text === "string") collect(record.text)
    if (Array.isArray(record.value)) record.value.forEach(collect)
  }
  collect(value)
  return [...new Set(discovered.map((email) => email.toLowerCase()))]
}

export function displayNameFromAddressHeader(value: string) {
  const bracket = value.lastIndexOf("<")
  if (bracket <= 0) return ""
  return value.slice(0, bracket).trim().replace(/^['"]|['"]$/g, "").slice(0, 300)
}

export function plainTextFromHtml(value: unknown) {
  if (typeof value !== "string") return ""
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

