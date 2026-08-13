import "server-only"

import type {
  ContractAiSuggestion,
  EmailAiSuggestion,
} from "@/lib/ai/schemas"

export type YachtAiContext = {
  name: string
  overview: string
  portGuidance: string
  rates: Array<{
    currency: string
    name: string
    taxRate: number
    validFrom: string
    validTo: string
    weeklyRate: number
  }>
}

export type EmailAiInput = {
  body: string
  receivedAt: string
  senderEmail: string
  senderName: string
  subject: string
  yachts: YachtAiContext[]
}

export type ContractAiInput = {
  bookingReference: string
  sourceText: string
}

export type ProviderResult<T> = {
  inputTokens: number | null
  model: string
  output: T
  outputTokens: number | null
  provider: string
  providerRequestId: string
}

export type AiConnectionResult = {
  detail: string
  latencyMs: number
  model: string
  ok: boolean
  provider: string
}

export type AiModel = {
  id: string
  label: string
}

export type AiSummaryStyle = "concise" | "detailed"

export interface AiProvider {
  analyzeContract(input: ContractAiInput, safetyIdentifier: string, signal?: AbortSignal): Promise<ProviderResult<ContractAiSuggestion>>
  analyzeEmail(input: EmailAiInput, safetyIdentifier: string, signal?: AbortSignal): Promise<ProviderResult<EmailAiSuggestion>>
  listModels(signal?: AbortSignal): Promise<AiModel[]>
  model: string
  name: string
  testConnection(signal?: AbortSignal): Promise<AiConnectionResult>
}
