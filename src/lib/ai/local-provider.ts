import "server-only"

import { randomUUID } from "node:crypto"

import {
  createLocalContractSuggestion,
  createLocalEmailSuggestion,
} from "@/lib/ai/local-analysis"
import type {
  AiProvider,
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

  async analyzeEmail(
    input: EmailAiInput,
    _safetyIdentifier: string,
  ): Promise<ProviderResult<EmailAiSuggestion>> {
    void _safetyIdentifier
    return {
      inputTokens: null,
      model: this.model,
      output: createLocalEmailSuggestion(input),
      outputTokens: null,
      provider: this.name,
      providerRequestId: `local-${randomUUID()}`,
    }
  }

  async analyzeContract(
    input: ContractAiInput,
    _safetyIdentifier: string,
  ): Promise<ProviderResult<ContractAiSuggestion>> {
    void _safetyIdentifier
    return {
      inputTokens: null,
      model: this.model,
      output: createLocalContractSuggestion(input),
      outputTokens: null,
      provider: this.name,
      providerRequestId: `local-${randomUUID()}`,
    }
  }
}
