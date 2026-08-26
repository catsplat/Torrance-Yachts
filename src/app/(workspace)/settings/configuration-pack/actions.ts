"use server"

import { revalidatePath } from "next/cache"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { parseConfigurationPack } from "@/lib/configuration-pack/schema"

export type ConfigurationPackActionState = { message?: string; preview?: Record<string, unknown>; success?: boolean }

async function administratorContext() {
  const context = await getAuthenticatedRequestContext()
  if (!context) return null
  return context.role === "administrator" ? context : null
}

export async function previewConfigurationPackAction(_state: ConfigurationPackActionState, formData: FormData): Promise<ConfigurationPackActionState> {
  const context = await administratorContext()
  if (!context) return { message: "Administrator access is required." }
  const parsed = parseConfigurationPack(String(formData.get("pack") ?? ""))
  if ("error" in parsed) return { message: parsed.error }
  const { data, error } = await context.supabase.rpc("preview_configuration_pack_v2", { p_payload: parsed.data })
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { message: "The pack could not be previewed." }
  return { message: "Review the proposed changes, then import when ready.", preview: data as Record<string, unknown>, success: true }
}

export async function importConfigurationPackAction(_state: ConfigurationPackActionState, formData: FormData): Promise<ConfigurationPackActionState> {
  const context = await administratorContext()
  if (!context) return { message: "Administrator access is required." }
  const parsed = parseConfigurationPack(String(formData.get("pack") ?? ""))
  if ("error" in parsed) return { message: parsed.error }
  const { data, error } = await context.supabase.rpc("import_configuration_pack_v2", { p_payload: parsed.data })
  if (error) return { message: error.message || "The configuration pack could not be imported." }
  revalidatePath("/settings/readiness")
  revalidatePath("/settings/configuration-pack")
  revalidatePath("/settings/communications")
  revalidatePath("/tasks/templates")
  revalidatePath("/yachts")
  return { message: "Configuration imported as draft/versioned operational data. Review and publish templates before live use.", preview: typeof data === "object" && data && !Array.isArray(data) ? data as Record<string, unknown> : undefined, success: true }
}
