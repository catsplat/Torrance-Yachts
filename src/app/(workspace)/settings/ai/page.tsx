import type { Metadata } from "next"
import { BrainCircuit, Cloud, Laptop } from "lucide-react"

import { AiConnectionTestForm, AiPreferencesForm, LocalAiPairingForm, OpenAiCredentialForm, RevokeLocalAiAgentForm } from "@/components/ai/ai-settings-forms"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getUserAiConfigurationSummary } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "AI settings" }

export default async function AiSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const [{ data: preference, error }, effective, { data: agents, error: agentsError }] = await Promise.all([
    supabase.from("user_ai_preferences").select("provider, model, enabled, summary_style").eq("user_id", user.id).single(),
    getUserAiConfigurationSummary(user.id),
    supabase.from("local_ai_agents").select("id, device_name, selected_model, status, last_seen_at").eq("user_id", user.id).neq("status", "revoked").order("created_at", { ascending: false }),
  ])
  if (error || !preference || agentsError) throw new Error("Unable to load your AI settings.")

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-semibold">AI settings</h1></div>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-primary" />Provider</CardTitle><CardDescription>Current: {effective.provider} / {effective.model}</CardDescription></CardHeader><CardContent className="space-y-5 pt-6"><AiPreferencesForm enabled={preference.enabled} model={preference.model} ollamaAvailable provider={preference.provider} summaryStyle={preference.summary_style} /><div className="border-t pt-5"><AiConnectionTestForm /></div></CardContent></Card>
    <div className="grid gap-5 md:grid-cols-2">
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Laptop className="size-5 text-primary" />Torrance Local AI</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><LocalAiPairingForm />{agents?.length ? <div className="space-y-2 border-t pt-4">{agents.map((agent) => <div className="flex items-center justify-between gap-3 text-sm" key={agent.id}><span>{agent.device_name}{agent.selected_model ? ` · ${agent.selected_model}` : ""}<span className="ml-2 text-muted-foreground">{agent.status}</span></span><RevokeLocalAiAgentForm agentId={agent.id} /></div>)}</div> : null}<p className="border-t pt-4 text-xs text-muted-foreground">The interim helper installs for the signed-in Mac user. A signed and notarised macOS app remains a separate distribution task.</p></CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Cloud className="size-5 text-primary" />OpenAI</CardTitle></CardHeader><CardContent className="pt-5"><OpenAiCredentialForm configured={effective.hasPersonalOpenAiApiKey} /></CardContent></Card>
    </div>
  </div>
}
