import type { ProviderEvidence } from "@/lib/ai/schemas"

export type StoredEvidence = {
  confidence: number
  end_offset: number | null
  excerpt: string
  field_path: string
  source_id: string
  source_type: "document" | "email_message"
  start_offset: number | null
}

export function locateEvidence(
  evidence: ProviderEvidence[],
  sourceText: string,
  sourceType: StoredEvidence["source_type"],
  sourceId: string,
) {
  const lowerSource = sourceText.toLocaleLowerCase()
  return evidence.flatMap((item): StoredEvidence[] => {
    const start = lowerSource.indexOf(item.excerpt.toLocaleLowerCase())
    if (start < 0) return []
    return [{
      confidence: item.confidence,
      end_offset: start + item.excerpt.length,
      excerpt: sourceText.slice(start, start + item.excerpt.length),
      field_path: item.field_path,
      source_id: sourceId,
      source_type: sourceType,
      start_offset: start,
    }]
  })
}
