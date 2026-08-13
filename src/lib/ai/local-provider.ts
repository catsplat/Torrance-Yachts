import "server-only"

import { randomUUID } from "node:crypto"

import {
  createLocalContractSuggestion,
  createLocalEmailSuggestion,
} from "@/lib/ai/local-analysis"
import type {
  AiConnectionResult,
  AiModel,
  AiProvider,
  AiSummaryStyle,
  ContractAiInput,
  EmailAiInput,
  ProviderResult,
} from "@/lib/ai/provider"
import type {
  ContractAiSuggestion,
  EmailAiSuggestion,
} from "@/lib/ai/schemas"

export class LocalAiProvider implements AiProvider {
  model = "deterministic-v1"
  name = "local"
  private summaryStyle: AiSummaryStyle

  constructor(configuration: { summaryStyle?: AiSummaryStyle } = {}) {
    this.summaryStyle = configuration.summaryStyle ?? "concise"
  }

  async listModels(): Promise<AiModel[]> {
    return [{ id: this.model, label: "Deterministic charter rules" }]
  }

  async testConnection(): Promise<AiConnectionResult> {
    return {
      detail: "Deterministic processing is available in this application.",
      latencyMs: 0,
      model: this.model,
      ok: true,
      provider: this.name,
    }
  }

  async analyzeEmail(
    input: EmailAiInput,
    _safetyIdentifier: string,
    _signal?: AbortSignal,
  ): Promise<ProviderResult<EmailAiSuggestion>> {
    void _safetyIdentifier
    void _signal
    const output = createLocalEmailSuggestion(input)
    if (this.summaryStyle === "detailed") {
      output.summary = `${output.summary} ${output.confidence_reason}`
    }
    return {
      inputTokens: null,
      model: this.model,
      output,
      outputTokens: null,
      provider: this.name,
      providerRequestId: `local-${randomUUID()}`,
    }
  }

  async analyzeContract(
    input: ContractAiInput,
    _safetyIdentifier: string,
    _signal?: AbortSignal,
  ): Promise<ProviderResult<ContractAiSuggestion>> {
    void _safetyIdentifier
    void _signal
    const output = createLocalContractSuggestion(input)
    if (this.summaryStyle === "detailed") {
      output.summary = `${output.summary} ${output.confidence_reason}`
    }
    return {
      inputTokens: null,
      model: this.model,
      output,
      outputTokens: null,
      provider: this.name,
      providerRequestId: `local-${randomUUID()}`,
    }
  }
}
