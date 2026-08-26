"use server"

import { revalidatePath } from "next/cache"

import { aiPreferencesSchema, openAiCredentialSchema } from "@/lib/ai/preferences-validation"
import { getUserAiProvider } from "@/lib/ai/config"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"

export type AiSettingsActionState = {
  message?: string
  models?: string[]
  pairingCode?: string
  pairingExpiresAt?: string
  workspaceAddress?: string
  success?: boolean
}

function configuredWorkspaceAddress() {
  const configured = process.env.APP_BASE_URL?.trim()
  if (!configured) return ""
  try {
    const address = new URL(configured)
    return address.protocol === "https:" || (address.protocol === "http:" && address.hostname === "localhost")
      ? address.origin
      : ""
  } catch {
    return ""
  }
}

export async function createLocalAiPairingAction(
  _state: AiSettingsActionState,
  _formData: FormData,
): Promise<AiSettingsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { data, error } = await context.supabase.rpc("create_my_local_ai_pairing_code")
  const pairing = data?.[0]
  if (error || !pairing) return { message: "A pairing code could not be created." }
  return { message: "Enter this code in Torrance Local AI within ten minutes.", pairingCode: pairing.pairing_code, pairingExpiresAt: pairing.expires_at, workspaceAddress: configuredWorkspaceAddress(), success: true }
}

export async function revokeMyLocalAiAgentAction(
  agentId: string,
  _state: AiSettingsActionState,
  _formData: FormData,
): Promise<AiSettingsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("revoke_my_local_ai_agent", {
    p_agent_id: agentId,
  })
  if (error) return { message: "That local AI helper could not be revoked." }
  revalidatePath("/settings/ai")
  return { message: "Local AI helper revoked. It can no longer contact this workspace.", success: true }
}

const expired = { message: "Your session has expired. Sign in again." }

export async function updateMyAiPreferencesAction(
  _state: AiSettingsActionState,
  formData: FormData,
): Promise<AiSettingsActionState> {
  const parsed = aiPreferencesSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    model: formData.get("model") ?? "",
    provider: formData.get("provider"),
    summaryStyle: formData.get("summaryStyle"),
  })
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Review your AI settings." }
  }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("update_my_ai_preferences", {
    p_enabled: parsed.data.enabled,
    p_model: parsed.data.model,
    p_provider: parsed.data.provider === "default" ? "" : parsed.data.provider,
    p_summary_style: parsed.data.summaryStyle,
  })
  if (error) return { message: "Your AI preferences could not be saved." }
  revalidatePath("/settings/ai")
  return { message: "AI preferences saved.", success: true }
}

export async function saveMyOpenAiKeyAction(
  _state: AiSettingsActionState,
  formData: FormData,
): Promise<AiSettingsActionState> {
  const parsed = openAiCredentialSchema.safeParse({ apiKey: formData.get("apiKey") })
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Review the API key." }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("save_my_openai_api_key", {
    p_api_key: parsed.data.apiKey,
    p_reason: "Updated personal OpenAI credential",
  })
  if (error) return { message: "The API key could not be stored." }
  revalidatePath("/settings/ai")
  return { message: "API key stored securely.", success: true }
}

export async function clearMyOpenAiKeyAction(
  _state: AiSettingsActionState,
  _formData: FormData,
): Promise<AiSettingsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("clear_my_openai_api_key", {
    p_reason: "Removed personal OpenAI credential",
  })
  if (error) return { message: "The stored API key could not be removed." }
  revalidatePath("/settings/ai")
  return { message: "Stored API key removed.", success: true }
}

export async function testMyAiConnectionAction(
  _state: AiSettingsActionState,
  _formData: FormData,
): Promise<AiSettingsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  try {
    const provider = await getUserAiProvider(context.userId)
    const result = await provider.testConnection()
    const models = result.ok ? await provider.listModels() : []
    return {
      message: `${result.detail} (${result.latencyMs} ms)`,
      models: models.slice(0, 50).map(({ id }) => id),
      success: result.ok,
    }
  } catch {
    return { message: "The selected provider could not be tested.", success: false }
  }
}
