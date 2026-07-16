import "server-only"

import { cache } from "react"

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

export const getAiReviewQueue = cache(async () => {
  const supabase = await createClient()
  const { data: suggestions, error } = await supabase
    .from("ai_suggestions")
    .select(`
      id, source_type, source_id, analysis_kind, summary, confidence, status, created_at,
      run:ai_runs!ai_suggestions_run_id_fkey(provider, model)
    `)
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) throw new Error("Unable to load the AI review queue.")
  const emailIds = suggestions.filter((item) => item.source_type === "email_message")
    .map((item) => item.source_id)
  const documentIds = suggestions.filter((item) => item.source_type === "document")
    .map((item) => item.source_id)
  const [emailsResult, documentsResult] = await Promise.all([
    emailIds.length
      ? supabase.from("email_messages").select("id, subject, sender_email").in("id", emailIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? supabase.from("documents").select(`
        id, title, booking_id,
        booking:bookings!documents_booking_id_fkey(reference)
      `).in("id", documentIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (emailsResult.error || documentsResult.error) {
    throw new Error("Unable to resolve AI review sources.")
  }
  return suggestions.map((suggestion) => {
    if (suggestion.source_type === "email_message") {
      const email = emailsResult.data.find((item) => item.id === suggestion.source_id)
      return {
        ...suggestion,
        href: `/emails/${suggestion.source_id}`,
        sourceLabel: email ? `${email.subject} · ${email.sender_email}` : "Email message",
      }
    }
    const document = documentsResult.data.find((item) => item.id === suggestion.source_id)
    return {
      ...suggestion,
      href: document ? `/bookings/${document.booking_id}/documents` : "/documents",
      sourceLabel: document
        ? `${document.booking.reference} · ${document.title}`
        : "Charter agreement",
    }
  })
})

export function getAiSettingsSummary() {
  return getAiConfigurationSummary()
}
