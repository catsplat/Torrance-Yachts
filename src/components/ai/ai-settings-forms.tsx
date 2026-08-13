"use client"

import { useActionState } from "react"

import {
  clearMyOpenAiKeyAction,
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
