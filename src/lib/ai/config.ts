import "server-only"

import type { AiProvider } from "@/lib/ai/provider"
import { LocalAiProvider } from "@/lib/ai/local-provider"
import { OllamaProvider } from "@/lib/ai/ollama-provider"
import { PairedLocalAiProvider } from "@/lib/ai/paired-local-provider"
import { OpenAiProvider } from "@/lib/ai/openai-provider"
import { createAdminClient } from "@/lib/supabase/admin"

export type AiProviderName = "local" | "ollama" | "openai"

type EffectiveUserAiConfiguration = {
  enabled: boolean
  hasPersonalOpenAiApiKey: boolean
  model: string
  provider: AiProviderName
  summaryStyle: "concise" | "detailed"
}

function organisationProvider(): AiProviderName {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
  if (provider === "local" || provider === "ollama" || provider === "openai") return provider
  throw new Error(`Unsupported AI provider: ${provider}`)
}

function defaultModel(provider: AiProviderName) {
  if (provider === "openai") return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna"
  if (provider === "ollama") return process.env.OLLAMA_MODEL?.trim() || "qwen3.5:4b-q4_K_M"
  return "deterministic-v1"
}

export function getAiProvider(): AiProvider {
  const provider = organisationProvider()
  if (provider === "local") return new LocalAiProvider()
  if (provider === "ollama") {
    if (process.env.APP_ENVIRONMENT === "production") {
      throw new Error("Local Ollama requires the approved desktop companion in production.")
    }
    return new OllamaProvider()
  }
  if (provider === "openai") return new OpenAiProvider()
  throw new Error(`Unsupported AI provider: ${provider}`)
}

/** Resolve a staff member's effective provider on the server. The service-role
 * RPC is the only path that can unwrap an optional personal cloud credential. */
export async function getUserAiProvider(userId: string): Promise<AiProvider> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("get_effective_user_ai_configuration", {
    p_user_id: userId,
  })
  if (error) throw new Error("The user's AI configuration could not be loaded.")
  const preference = data?.[0]
  if (preference && !preference.enabled) {
    throw new Error("AI assistance is disabled for this user.")
  }
  const provider = (preference?.provider || organisationProvider()) as AiProviderName
  const model = preference?.model || defaultModel(provider)
  const summaryStyle = preference?.summary_style === "detailed" ? "detailed" : "concise"
  if (provider === "local") return new LocalAiProvider({ summaryStyle })
  if (provider === "ollama") {
    if (process.env.APP_ENVIRONMENT !== "production") return new OllamaProvider({ model, summaryStyle })
    const { data: agent, error: agentError } = await admin.from("local_ai_agents")
      .select("id, selected_model, status, last_seen_at").eq("user_id", userId).eq("status", "available")
      .order("last_seen_at", { ascending: false }).limit(1).maybeSingle()
    const active = agent?.last_seen_at && new Date(agent.last_seen_at).getTime() >= Date.now() - 5 * 60_000
    if (agentError || !agent || !active) throw new Error("Your paired Mac is offline. Open Torrance Local AI or choose another provider.")
    return new PairedLocalAiProvider({ agentId: agent.id, model: agent.selected_model || model, summaryStyle, userId })
  }
  return new OpenAiProvider({
    apiKey: preference?.openai_api_key || process.env.OPENAI_API_KEY,
    model,
    summaryStyle,
  })
}

export async function getUserAiConfigurationSummary(userId: string): Promise<EffectiveUserAiConfiguration> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("get_effective_user_ai_configuration", {
    p_user_id: userId,
  })
  if (error) throw new Error("The user's AI configuration could not be loaded.")
  const preference = data?.[0]
  const provider = (preference?.provider || organisationProvider()) as AiProviderName
  return {
    enabled: preference?.enabled ?? true,
    hasPersonalOpenAiApiKey: preference?.has_personal_openai_api_key ?? false,
    model: preference?.model || defaultModel(provider),
    provider,
    summaryStyle: preference?.summary_style === "detailed" ? "detailed" : "concise",
  }
}

export function getAiConfigurationSummary() {
  const provider = organisationProvider()
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
