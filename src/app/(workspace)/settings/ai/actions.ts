"use server"

import { revalidatePath } from "next/cache"

import { aiPreferencesSchema, openAiCredentialSchema } from "@/lib/ai/preferences-validation"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"

export type AiSettingsActionState = { message?: string; success?: boolean }

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
