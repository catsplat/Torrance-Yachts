import "server-only"

import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getAiProvider } from "@/lib/ai/config"
import { locateEvidence } from "@/lib/ai/evidence"
import type { EmailAiInput, YachtAiContext } from "@/lib/ai/provider"
import {
  contractAiSuggestionSchema,
  emailAiSuggestionSchema,
} from "@/lib/ai/schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

const EMAIL_PROMPT_VERSION = "email-triage-v1"
const CONTRACT_PROMPT_VERSION = "contract-extraction-v1"

type RequestContext = {
  supabase: SupabaseClient<Database>
  userId: string
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function safetyIdentifier(userId: string) {
  return `user_${sha256(userId).slice(0, 32)}`
}

function safeFailure(error: unknown) {
  if (error instanceof Error) {
    return {
      code: error.name === "Error" ? "provider_error" : error.name.toLowerCase().slice(0, 100),
      message: [process.env.OPENAI_API_KEY, process.env.OLLAMA_API_KEY]
        .filter((secret): secret is string => Boolean(secret))
        .reduce((message, secret) => message.replaceAll(secret, "[redacted]"), error.message)
        .slice(0, 1000),
    }
  }
  return { code: "provider_error", message: "The configured AI provider failed." }
}

async function getYachtContext(supabase: SupabaseClient<Database>): Promise<YachtAiContext[]> {
  const [yachtsResult, profilesResult, ratesResult] = await Promise.all([
    supabase.from("yachts").select("id, name").eq("status", "active").order("name"),
    supabase.from("yacht_commercial_profiles").select("yacht_id, overview, port_guidance"),
    supabase.from("yacht_rate_periods").select(
      "yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate",
    ).eq("active", true).order("valid_from"),
  ])
  if (yachtsResult.error || profilesResult.error || ratesResult.error) {
    throw new Error("Approved yacht context could not be loaded.")
  }
  return yachtsResult.data.map((yacht) => {
    const profile = profilesResult.data.find((item) => item.yacht_id === yacht.id)
    return {
      name: yacht.name,
      overview: profile?.overview ?? "",
      portGuidance: profile?.port_guidance ?? "",
      rates: ratesResult.data.filter((rate) => rate.yacht_id === yacht.id).map((rate) => ({
        currency: rate.currency,
        name: rate.name,
        taxRate: Number(rate.tax_rate),
        validFrom: rate.valid_from,
        validTo: rate.valid_to,
        weeklyRate: Number(rate.weekly_rate),
      })),
    }
  })
}

async function prepareRun(
  context: RequestContext,
  values: {
    analysisKind: "contract_extraction" | "email_triage"
    inputSha: string
    model: string
    promptVersion: string
    provider: string
    requestToken: string
    sourceId: string
    sourceType: "document" | "email_message"
  },
) {
  const requestKey = `${values.sourceType}:${values.sourceId}:${values.promptVersion}:${values.requestToken}`
  const { data: runId, error } = await context.supabase.rpc("request_ai_analysis", {
    p_analysis_kind: values.analysisKind,
    p_input_sha256: values.inputSha,
    p_model: values.model,
    p_prompt_version: values.promptVersion,
    p_provider: values.provider,
    p_request_key: requestKey,
    p_source_id: values.sourceId,
    p_source_type: values.sourceType,
  })
  if (error || !runId) throw new Error("The AI analysis request could not be recorded.")
  const admin = createAdminClient()
  const { data: run, error: runError } = await admin
    .from("ai_runs")
    .select("id, status")
    .eq("id", runId)
    .single()
  if (runError || !run) throw new Error("The AI analysis run could not be loaded.")
  return { admin, run }
}

export async function generateEmailSuggestion(
  context: RequestContext,
  messageId: string,
  requestToken: string,
) {
  const { data: message, error } = await context.supabase
    .from("email_messages")
    .select("id, subject, body_text, snippet, sender_name, sender_email, received_at")
    .eq("id", messageId)
    .single()
  if (error || !message) throw new Error("Email message not found.")
  const provider = getAiProvider()
  const input: EmailAiInput = {
    body: (message.body_text || message.snippet).slice(0, 50000),
    receivedAt: message.received_at,
    senderEmail: message.sender_email,
    senderName: message.sender_name ?? "",
    subject: message.subject,
    yachts: await getYachtContext(context.supabase),
  }
  const inputSnapshot = JSON.stringify(input)
  const { admin, run } = await prepareRun(context, {
    analysisKind: "email_triage",
    inputSha: sha256(inputSnapshot),
    model: provider.model,
    promptVersion: EMAIL_PROMPT_VERSION,
    provider: provider.name,
    requestToken,
    sourceId: message.id,
    sourceType: "email_message",
  })
  if (run.status === "completed") return { existing: true, runId: run.id }
  if (run.status !== "queued") throw new Error("This AI analysis request is already being processed.")
  const { error: startError } = await admin.rpc("start_ai_analysis", { p_run_id: run.id })
  if (startError) throw new Error("The AI analysis could not be started.")
  try {
    const result = await provider.analyzeEmail(input, safetyIdentifier(context.userId))
    const output = emailAiSuggestionSchema.parse(result.output)
    const sourceText = `${input.subject}\n${input.body}`
    const evidence = locateEvidence(output.evidence, sourceText, "email_message", message.id)
    const { error: completeError } = await admin.rpc("complete_ai_analysis", {
      p_confidence: output.confidence,
      p_evidence: evidence,
      p_input_tokens: result.inputTokens ?? undefined,
      p_output_tokens: result.outputTokens ?? undefined,
      p_payload: output,
      p_provider_request_id: result.providerRequestId,
      p_run_id: run.id,
      p_summary: output.summary,
    })
    if (completeError) throw new Error("Validated AI output could not be recorded.")
    return { existing: false, runId: run.id }
  } catch (providerError) {
    const failure = safeFailure(providerError)
    await admin.rpc("fail_ai_analysis", {
      p_error_code: failure.code,
      p_error_message: failure.message,
      p_run_id: run.id,
    })
    throw providerError
  }
}

export async function generateNextPendingEmailSuggestion() {
  const admin = createAdminClient()
  const [messagesResult, runsResult, ownerResult] = await Promise.all([
    admin
      .from("email_messages")
      .select("id")
      .eq("classification", "unclassified")
      .eq("processing_status", "review_required")
      .order("received_at")
      .limit(25),
    admin
      .from("ai_runs")
      .select("source_id")
      .eq("source_type", "email_message")
      .eq("analysis_kind", "email_triage")
      .in("status", ["queued", "processing", "completed"])
      .limit(1000),
    admin
      .from("profiles")
      .select("id")
      .eq("active", true)
      .order("role", { ascending: true })
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ])
  if (messagesResult.error || runsResult.error || ownerResult.error) {
    throw new Error("Pending AI email work could not be loaded.")
  }
  if (!ownerResult.data) return { processed: false as const }
  const existingSourceIds = new Set(runsResult.data.map((run) => run.source_id))
  const message = messagesResult.data.find((candidate) => !existingSourceIds.has(candidate.id))
  if (!message) return { processed: false as const }
  const result = await generateEmailSuggestion(
    { supabase: admin, userId: ownerResult.data.id },
    message.id,
    "automatic-v1",
  )
  return { messageId: message.id, processed: true as const, ...result }
}

export async function generateContractSuggestion(
  context: RequestContext,
  values: {
    contractText: string
    documentId: string
    requestToken: string
  },
) {
  const { data: document, error } = await context.supabase
    .from("documents")
    .select(`
      id, verification_status, document_type,
      booking:bookings!documents_booking_id_fkey(reference)
    `)
    .eq("id", values.documentId)
    .single()
  if (
    error || !document || document.document_type !== "charter_agreement" ||
    document.verification_status !== "verified"
  ) throw new Error("A verified charter agreement is required.")
  const provider = getAiProvider()
  const sourceText = values.contractText.slice(0, 30000)
  const booking = Array.isArray(document.booking) ? document.booking[0] : document.booking
  const input = {
    bookingReference: booking?.reference ?? "Booking",
    sourceText,
  }
  const { admin, run } = await prepareRun(context, {
    analysisKind: "contract_extraction",
    inputSha: sha256(JSON.stringify(input)),
    model: provider.model,
    promptVersion: CONTRACT_PROMPT_VERSION,
    provider: provider.name,
    requestToken: values.requestToken,
    sourceId: document.id,
    sourceType: "document",
  })
  if (run.status === "completed") return { existing: true, runId: run.id }
  if (run.status !== "queued") throw new Error("This extraction request is already being processed.")
  const { error: startError } = await admin.rpc("start_ai_analysis", { p_run_id: run.id })
  if (startError) throw new Error("The contract extraction could not be started.")
  try {
    const result = await provider.analyzeContract(input, safetyIdentifier(context.userId))
    const output = contractAiSuggestionSchema.parse(result.output)
    const evidence = locateEvidence(output.evidence, sourceText, "document", document.id)
    const { error: completeError } = await admin.rpc("complete_ai_analysis", {
      p_confidence: output.confidence,
      p_evidence: evidence,
      p_input_tokens: result.inputTokens ?? undefined,
      p_output_tokens: result.outputTokens ?? undefined,
      p_payload: output,
      p_provider_request_id: result.providerRequestId,
      p_run_id: run.id,
      p_summary: output.summary,
    })
    if (completeError) throw new Error("Validated contract output could not be recorded.")
    return { existing: false, runId: run.id }
  } catch (providerError) {
    const failure = safeFailure(providerError)
    await admin.rpc("fail_ai_analysis", {
      p_error_code: failure.code,
      p_error_message: failure.message,
      p_run_id: run.id,
    })
    throw providerError
  }
}
