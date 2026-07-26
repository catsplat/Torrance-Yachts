import "server-only"

import type { AiProvider } from "@/lib/ai/provider"
import { LocalAiProvider } from "@/lib/ai/local-provider"
import { OllamaProvider } from "@/lib/ai/ollama-provider"
import { OpenAiProvider } from "@/lib/ai/openai-provider"

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
  if (provider === "local") return new LocalAiProvider()
  if (provider === "ollama") return new OllamaProvider()
  if (provider === "openai") return new OpenAiProvider()
  throw new Error(`Unsupported AI provider: ${provider}`)
}

export function getAiConfigurationSummary() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
  return {
    enabled: provider === "local" || provider === "ollama" ||
      (provider === "openai" && Boolean(process.env.OPENAI_API_KEY)),
    model: provider === "openai"
      ? process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna"
      : provider === "ollama"
        ? process.env.OLLAMA_MODEL?.trim() || "qwen3.5:4b-q4_K_M"
        : "deterministic-v1",
    provider,
  }
}
