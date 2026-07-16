import type { ContractAiInput, EmailAiInput } from "@/lib/ai/provider"
import type {
  ContractAiSuggestion,
  EmailAiSuggestion,
  ProviderEvidence,
} from "@/lib/ai/schemas"

const monthNumbers: Record<string, string> = {
  april: "04",
  august: "08",
  december: "12",
  february: "02",
  january: "01",
  july: "07",
  june: "06",
  march: "03",
  may: "05",
  november: "11",
  october: "10",
  september: "09",
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] ?? null
}

function dateMatches(text: string) {
  const results: Array<{ iso: string; source: string }> = []
  const pattern = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi
  for (const match of text.matchAll(pattern)) {
    results.push({
      iso: `${match[3]}-${monthNumbers[match[2].toLowerCase()]}-${match[1].padStart(2, "0")}`,
      source: match[0],
    })
  }
  return results
}

function moneyMatch(text: string) {
  const match = text.match(/\b(EUR|GBP|USD)\s*([\d,]+(?:\.\d{1,2})?)/i)
  if (!match) return null
  return {
    amount: Number(match[2].replaceAll(",", "")),
    currency: match[1].toUpperCase(),
    source: match[0],
  }
}

function evidence(fieldPath: string, excerpt: string | null, confidence: number): ProviderEvidence[] {
  return excerpt ? [{ confidence, excerpt, field_path: fieldPath }] : []
}

export function createLocalEmailSuggestion(input: EmailAiInput): EmailAiSuggestion {
  const source = `${input.subject}\n${input.body}`
  const lower = source.toLowerCase()
  const dates = dateMatches(source)
  const guests = firstMatch(source, /\b\d{1,2}\s+guests?\b/i)
  const guestCount = guests ? Number.parseInt(guests, 10) : null
  const budget = moneyMatch(source)
  const yacht = input.yachts.find((candidate) => lower.includes(candidate.name.toLowerCase())) ?? null
  const route = source.match(/\b([A-Z][A-Za-z -]{1,50})\s+to\s+([A-Z][A-Za-z -]{1,50})\b/)
  const classification = /unsubscribe|newsletter|mailing list/i.test(source)
    ? "circular"
    : /charter|availability|yacht|guests?/i.test(source)
      ? "new_enquiry"
      : "other_relevant"
  const rate = yacht?.rates.find((candidate) => {
    const start = dates[0]?.iso
    return start ? start >= candidate.validFrom && start <= candidate.validTo : false
  }) ?? yacht?.rates[0] ?? null
  const draftBody = yacht
    ? [
      `Dear ${input.senderName || "Sir or Madam"},`,
      "",
      `Many thanks for your enquiry regarding ${yacht.name}.`,
      rate
        ? `The current indicative weekly rate is ${rate.currency} ${rate.weeklyRate.toLocaleString("en-GB")} plus ${rate.taxRate}% tax, subject to human review and availability.`
        : "We are reviewing availability and the applicable commercial terms.",
      yacht.portGuidance,
      "",
      "I will remain at your disposal for any further questions.",
    ].join("\n")
    : "Many thanks for the enquiry. We are reviewing the request and will respond with the relevant yacht information."
  return {
    classification,
    confidence: classification === "new_enquiry" ? 0.82 : 0.62,
    confidence_reason: "Local development provider used deterministic terms, dates, yacht names, and amounts.",
    draft: {
      body: draftBody,
      subject: `Re: ${input.subject}`.slice(0, 300),
    },
    evidence: [
      ...evidence("classification", firstMatch(source, /\b(charter|availability|yacht|newsletter)\b/i), 0.8),
      ...evidence("extracted.charter_start_date", dates[0]?.source ?? null, 0.9),
      ...evidence("extracted.charter_end_date", dates[1]?.source ?? null, 0.9),
      ...evidence("extracted.guest_count", guests, 0.9),
      ...evidence("extracted.budget_amount", budget?.source ?? null, 0.9),
      ...evidence("extracted.requested_yacht_name", yacht?.name ?? null, 0.95),
    ],
    extracted: {
      budget_amount: budget?.amount ?? null,
      charter_end_date: dates[1]?.iso ?? null,
      charter_start_date: dates[0]?.iso ?? null,
      company_name: null,
      currency: budget?.currency ?? null,
      customer_email: input.senderEmail,
      customer_name: input.senderName || null,
      customer_phone: null,
      disembarkation_port: route?.[2]?.trim() ?? null,
      embarkation_port: route?.[1]?.trim() ?? null,
      guest_count: guestCount,
      requested_yacht_name: yacht?.name ?? null,
      requirements: [],
    },
    summary: yacht
      ? `${input.senderName || input.senderEmail} is enquiring about ${yacht.name}${dates.length >= 2 ? ` from ${dates[0].iso} to ${dates[1].iso}` : ""}${guestCount ? ` for ${guestCount} guests` : ""}.`
      : `${input.senderName || input.senderEmail}: ${input.subject}`,
  }
}

export function createLocalContractSuggestion(input: ContractAiInput): ContractAiSuggestion {
  const dates = dateMatches(input.sourceText)
  const fee = moneyMatch(input.sourceText)
  const yacht = firstMatch(input.sourceText, /\bM\/Y\s+[A-Z][A-Za-z0-9 -]{1,60}\b/)
  const tax = input.sourceText.match(/\b(\d+(?:\.\d+)?)%\s+(?:VAT|tax)\b/i)
  const commission = input.sourceText.match(/\b(\d+(?:\.\d+)?)%\s+commission\b/i)
  return {
    confidence: dates.length >= 2 && fee ? 0.8 : 0.55,
    confidence_reason: "Local development provider extracted explicit dates, amounts, rates, and labelled yacht text.",
    evidence: [
      ...evidence("extracted.charter_start_date", dates[0]?.source ?? null, 0.9),
      ...evidence("extracted.charter_end_date", dates[1]?.source ?? null, 0.9),
      ...evidence("extracted.charter_fee", fee?.source ?? null, 0.9),
      ...evidence("extracted.yacht_name", yacht, 0.85),
      ...evidence("extracted.tax_rate", tax?.[0] ?? null, 0.85),
      ...evidence("extracted.commission_rate", commission?.[0] ?? null, 0.85),
    ],
    extracted: {
      broker_company_name: null,
      broker_name: null,
      charter_end_date: dates[1]?.iso ?? null,
      charter_fee: fee?.amount ?? null,
      charter_start_date: dates[0]?.iso ?? null,
      charterer_name: null,
      commission_rate: commission ? Number(commission[1]) : null,
      currency: fee?.currency ?? null,
      disembarkation_port: null,
      embarkation_port: null,
      instalments: [],
      tax_rate: tax ? Number(tax[1]) : null,
      yacht_name: yacht,
    },
    summary: `Local extraction suggestion for ${input.bookingReference}; every value requires comparison with the signed agreement.`,
  }
}
