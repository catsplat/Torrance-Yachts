import type { Metadata } from "next"
import { BrainCircuit, Cloud, Laptop } from "lucide-react"

import { AiPreferencesForm, OpenAiCredentialForm } from "@/components/ai/ai-settings-forms"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getUserAiConfigurationSummary } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "AI settings" }

export default async function AiSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const [{ data: preference, error }, effective] = await Promise.all([
    supabase.from("user_ai_preferences").select("provider, model, enabled, summary_style").eq("user_id", user.id).single(),
    getUserAiConfigurationSummary(user.id),
  ])
  if (error || !preference) throw new Error("Unable to load your AI settings.")

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-semibold">AI settings</h1></div>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-primary" />Provider</CardTitle><CardDescription>Current: {effective.provider} / {effective.model}</CardDescription></CardHeader><CardContent className="pt-6"><AiPreferencesForm enabled={preference.enabled} model={preference.model} provider={preference.provider} summaryStyle={preference.summary_style} /></CardContent></Card>
    <div className="grid gap-5 md:grid-cols-2">
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Laptop className="size-5 text-primary" />Local Ollama</CardTitle></CardHeader><CardContent className="pt-5 text-sm text-muted-foreground">Local processing requires the approved companion connection. The hosted server never connects to an employee computer directly.</CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Cloud className="size-5 text-primary" />OpenAI</CardTitle></CardHeader><CardContent className="pt-5"><OpenAiCredentialForm configured={effective.hasPersonalOpenAiApiKey} /></CardContent></Card>
    </div>
  </div>
}
