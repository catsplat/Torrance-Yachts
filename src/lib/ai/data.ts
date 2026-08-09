import "server-only"

import { cache } from "react"
import { z } from "zod"

import { getAiConfigurationSummary } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"

export async function getLatestAiSuggestion(
  sourceType: "document" | "email_message",
  sourceId: string,
) {
  const supabase = await createClient()
  const { data: suggestion, error } = await supabase
    .from("ai_suggestions")
    .select(`
      *,
      run:ai_runs!ai_suggestions_run_id_fkey(
        provider, model, prompt_version, input_tokens, output_tokens, completed_at
      ),
      reviewer:profiles!ai_suggestions_reviewed_by_fkey(display_name)
    `)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error("Unable to load the AI suggestion.")
  if (!suggestion) return null
  const [evidenceResult, revisionsResult] = await Promise.all([
    supabase.from("ai_suggestion_evidence").select("*")
      .eq("suggestion_id", suggestion.id).order("field_path"),
    supabase.from("ai_suggestion_revisions").select(`
      *,
      actor:profiles!ai_suggestion_revisions_changed_by_fkey(display_name)
    `).eq("suggestion_id", suggestion.id).order("created_at", { ascending: false }),
  ])
  if (evidenceResult.error || revisionsResult.error) {
    throw new Error("Unable to load AI evidence and corrections.")
  }
  return {
    evidence: evidenceResult.data,
    revisions: revisionsResult.data,
    suggestion,
  }
}

export const getCommunicationTemplates = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("communication_templates")
    .select(`
      *,
      approver:profiles!communication_templates_approved_by_fkey(display_name)
    `)
    .order("kind")
    .order("version_number", { ascending: false })
  if (error) throw new Error("Unable to load communication templates.")
  return data
})

export const aiReviewPageSize = 50

const aiReviewCursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() })

function decodeAiReviewCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    return aiReviewCursorSchema.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    ).data ?? null
  } catch {
    return null
  }
}

export async function getAiReviewPage(filters: {
  cursor?: string
  status?: "approved" | "pending_review" | "rejected" | "superseded"
}) {
  const cursor = decodeAiReviewCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data, error }, { data: totalCount, error: countError }] = await Promise.all([
    supabase.rpc("list_ai_review_page", {
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
      p_limit: aiReviewPageSize + 1,
      p_status: filters.status,
    }),
    supabase.rpc("count_ai_review", { p_status: filters.status }),
  ])
  if (error || countError) throw new Error("Unable to load the AI review queue.")
  const hasNextPage = data.length > aiReviewPageSize
  const suggestions = data.slice(0, aiReviewPageSize)
  const last = suggestions.at(-1)
  return {
    nextCursor: hasNextPage && last
      ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
      : null,
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      sourceLabel: suggestion.source_label,
    })),
    totalCount: Number(totalCount ?? 0),
  }
}

export function getAiSettingsSummary() {
  return getAiConfigurationSummary()
}
