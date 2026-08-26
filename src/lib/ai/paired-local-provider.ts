import "server-only"

import { randomUUID } from "node:crypto"

import type { AiConnectionResult, AiModel, AiProvider, AiSummaryStyle, ContractAiInput, EmailAiInput, ProviderResult } from "./provider"
import { contractAiSuggestionSchema, emailAiSuggestionSchema, type ContractAiSuggestion, type EmailAiSuggestion } from "./schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

type JobRow = { status: "completed" | "failed" | "pending" | "claimed"; result_payload: unknown; error_message: string | null; provider_request_id: string | null; input_tokens: number | null; output_tokens: number | null }

async function pause(ms: number, signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason) }, { once: true })
  })
}

/** A user-paired Mac helper performs the request by polling outward.  This class
 * only waits for a bounded, validated result; it never contacts a Mac directly. */
export class PairedLocalAiProvider implements AiProvider {
  name = "paired_ollama"
  constructor(private readonly options: { agentId: string; model: string; summaryStyle: AiSummaryStyle; userId: string }) {}
  get model() { return this.options.model }

  async listModels(): Promise<AiModel[]> { return [{ id: this.model, label: `${this.model} (paired Mac)` }] }
  async testConnection(): Promise<AiConnectionResult> {
    const admin = createAdminClient()
    const { data } = await admin.from("local_ai_agents").select("status,last_seen_at").eq("id", this.options.agentId).maybeSingle()
    const recent = data?.last_seen_at && new Date(data.last_seen_at).getTime() >= Date.now() - 5 * 60_000
    return { detail: recent && data?.status === "available" ? "Your paired Mac and selected Ollama model are ready." : "Your paired Mac is offline. Open Torrance Local AI on that Mac.", latencyMs: 0, model: this.model, ok: Boolean(recent && data?.status === "available"), provider: this.name }
  }

  private async request<T>(analysisKind: "email_triage" | "contract_extraction", input: unknown, schema: { parse(value: unknown): T }, signal?: AbortSignal): Promise<ProviderResult<T>> {
    const admin = createAdminClient()
    const { data: inserted, error } = await admin.from("local_ai_jobs").insert({ agent_id: this.options.agentId, analysis_kind: analysisKind, input_payload: { input, summary_style: this.options.summaryStyle } as Json, owner_user_id: this.options.userId }).select("id").single()
    if (error || !inserted) throw new Error("A local AI job could not be queued.")
    const deadline = Date.now() + 45_000
    while (Date.now() < deadline) {
      if (signal?.aborted) throw signal.reason
      const { data: row, error: readError } = await admin.from("local_ai_jobs").select("status,result_payload,error_message,provider_request_id,input_tokens,output_tokens").eq("id", inserted.id).single<JobRow>()
      if (readError || !row) throw new Error("The local AI job could not be read.")
      if (row.status === "completed") return { model: this.model, output: schema.parse(row.result_payload), provider: this.name, providerRequestId: row.provider_request_id || `paired-ollama-${randomUUID()}`, inputTokens: row.input_tokens, outputTokens: row.output_tokens }
      if (row.status === "failed") throw new Error(row.error_message || "The paired Mac could not complete the analysis.")
      await pause(500, signal)
    }
    throw new Error("The paired Mac did not return an analysis in time. The request remains reviewable and can be retried.")
  }

  analyzeEmail(input: EmailAiInput, _safetyIdentifier: string, signal?: AbortSignal): Promise<ProviderResult<EmailAiSuggestion>> { return this.request("email_triage", input, emailAiSuggestionSchema, signal) }
  analyzeContract(input: ContractAiInput, _safetyIdentifier: string, signal?: AbortSignal): Promise<ProviderResult<ContractAiSuggestion>> { return this.request("contract_extraction", input, contractAiSuggestionSchema, signal) }
}
