"use client"

import { useActionState } from "react"

import {
  clearMyOpenAiKeyAction,
  createLocalAiPairingAction,
  revokeMyLocalAiAgentAction,
  saveMyOpenAiKeyAction,
  testMyAiConnectionAction,
  updateMyAiPreferencesAction,
  type AiSettingsActionState,
} from "@/app/(workspace)/settings/ai/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: AiSettingsActionState = {}

function Feedback({ state }: { state: AiSettingsActionState }) {
  if (!state.message) return null
  return <p aria-live="polite" className={state.success ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>{state.message}</p>
}

export function AiPreferencesForm({
  enabled,
  model,
  provider,
  summaryStyle,
  ollamaAvailable,
}: {
  enabled: boolean
  model: string | null
  provider: string | null
  summaryStyle: string
  ollamaAvailable: boolean
}) {
  const [state, action, pending] = useActionState(updateMyAiPreferencesAction, initialState)
  return <form action={action} className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Provider
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" defaultValue={provider ?? "default"} name="provider">
          <option value="default">Workspace default</option>
          <option value="local">Deterministic test provider</option>
          <option disabled={!ollamaAvailable} value="ollama">Local Ollama{ollamaAvailable ? "" : " (desktop companion required)"}</option>
          <option value="openai">OpenAI</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">Model
        <Input defaultValue={model ?? ""} maxLength={128} name="model" placeholder="Use provider default" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Summary style
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" defaultValue={summaryStyle} name="summaryStyle">
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border px-3 py-2.5 text-sm font-medium">
        <input className="size-4 accent-primary" defaultChecked={enabled} name="enabled" type="checkbox" />
        Enable AI assistance
      </label>
    </div>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save preferences"}</Button><Feedback state={state} /></div>
  </form>
}

export function OpenAiCredentialForm({ configured }: { configured: boolean }) {
  const [saveState, saveAction, saving] = useActionState(saveMyOpenAiKeyAction, initialState)
  const [clearState, clearAction, clearing] = useActionState(clearMyOpenAiKeyAction, initialState)
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{configured ? "A personal API key is stored." : "No personal API key is stored. The workspace key is used when available."}</p>
    <form action={saveAction} className="space-y-3">
      <label className="grid gap-2 text-sm font-medium">OpenAI API key
        <Input autoComplete="off" name="apiKey" placeholder="Enter a new key" type="password" />
      </label>
      <div className="flex flex-wrap items-center gap-3"><Button disabled={saving} type="submit">{saving ? "Saving…" : configured ? "Replace key" : "Store key"}</Button><Feedback state={saveState} /></div>
    </form>
    {configured ? <form action={clearAction} className="flex flex-wrap items-center gap-3"><Button disabled={clearing} type="submit" variant="outline">Remove key</Button><Feedback state={clearState} /></form> : null}
  </div>
}

export function AiConnectionTestForm() {
  const [state, action, pending] = useActionState(testMyAiConnectionAction, initialState)
  return <form action={action} className="space-y-3">
    <Button disabled={pending} type="submit" variant="outline">
      {pending ? "Testing connection..." : "Test connection"}
    </Button>
    <Feedback state={state} />
    {state.models?.length ? (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Available models</p>
        <p className="max-h-24 overflow-auto text-xs text-muted-foreground">
          {state.models.join(", ")}
        </p>
      </div>
    ) : null}
  </form>
}

export function LocalAiPairingForm() {
  const [state, action, pending] = useActionState(createLocalAiPairingAction, initialState)
  const recommendedModel = "qwen3:4b-instruct"
  return <form action={action} className="space-y-3">
    <p className="text-sm text-muted-foreground">Use your Mac’s own Ollama installation. It stays on the Mac; the workspace only sends it review requests.</p>
    <div className="rounded-lg border bg-muted/20 p-3 text-sm"><p className="font-medium">Recommended: Qwen3 4B Instruct</p><p className="mt-1 text-muted-foreground">A balanced local model for email summaries and structured review.</p></div>
    <Button disabled={pending} type="submit" variant="outline">{pending ? "Creating code…" : "Set up this Mac"}</Button>
    <Feedback state={state} />
    {state.pairingCode ? <div className="space-y-3 rounded-lg border bg-muted/40 p-3"><div><p className="text-xs text-muted-foreground">One-time pairing code</p><p className="mt-1 font-mono text-lg font-semibold tracking-widest">{state.pairingCode}</p></div><ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground"><li>Install and open <a className="text-primary underline" href="https://ollama.com/download" rel="noreferrer" target="_blank">Ollama for macOS</a>.</li><li>On the Mac, run the setup command below once. It downloads the recommended model and keeps the helper running.</li></ol><code className="block overflow-x-auto rounded bg-background p-2 text-xs text-foreground">node local-ai-helper.mjs --server https://your-workspace --code {state.pairingCode} --setup --model {recommendedModel}</code><p className="text-xs text-muted-foreground">Replace <code>https://your-workspace</code> with this site’s address. Expires {new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(new Date(state.pairingExpiresAt!))}. The helper only makes outbound connections.</p></div> : null}
  </form>
}

export function RevokeLocalAiAgentForm({ agentId }: { agentId: string }) {
  const [state, action, pending] = useActionState(revokeMyLocalAiAgentAction.bind(null, agentId), initialState)
  return <form action={action} className="flex items-center gap-2">
    <Button disabled={pending} size="sm" type="submit" variant="outline">{pending ? "Revoking…" : "Remove"}</Button>
    <Feedback state={state} />
  </form>
}
