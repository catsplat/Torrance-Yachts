"use client"

import { useActionState } from "react"

import {
  approveCommunicationTemplateAction,
  cloneCommunicationTemplateAction,
  createCommunicationTemplateAction,
  updateCommunicationTemplateAction,
  type AiActionState,
} from "@/app/(workspace)/ai/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  communicationTemplatePlaceholders,
} from "@/lib/ai/template"
import {
  communicationTemplateKindValues,
} from "@/lib/ai/template-validation"
import type { Tables } from "@/types/database"

const initialState: AiActionState = {}

function Feedback({ state }: { state: AiActionState }) {
  return state.message ? (
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
      {state.message}
    </p>
  ) : null
}

export function NewCommunicationTemplateForm() {
  const [state, action, pending] = useActionState(createCommunicationTemplateAction, initialState)
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        Template type
        <select className="h-9 rounded-md border bg-background px-3 text-sm" name="kind">
          {communicationTemplateKindValues.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Name<Input name="name" required /></label>
      <label className="grid gap-1 text-sm">Subject <span className="text-xs font-normal text-muted-foreground">(optional for replies in an existing thread)</span><Input name="subjectTemplate" /></label>
      <label className="grid gap-1 text-sm">
        Plain-text body
        <textarea className="min-h-48 rounded-md border bg-background p-3 font-mono text-sm" name="bodyTemplate" required />
      </label>
      <p className="text-xs text-muted-foreground">
        Allowed placeholders depend on the selected type and are validated by PostgreSQL.
      </p>
      <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create draft"}</Button>
      <Feedback state={state} />
    </form>
  )
}

export function CommunicationTemplateVersionForm({
  template,
}: {
  template: Tables<"communication_templates">
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCommunicationTemplateAction,
    initialState,
  )
  const [cloneState, cloneAction, clonePending] = useActionState(
    cloneCommunicationTemplateAction,
    initialState,
  )
  const [approvalState, approvalAction, approvalPending] = useActionState(
    approveCommunicationTemplateAction,
    initialState,
  )
  const placeholders = communicationTemplatePlaceholders[template.kind]
  if (template.status !== "draft") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          {template.subject_template ? <p className="text-sm font-medium">{template.subject_template}</p> : <p className="text-sm text-muted-foreground">Uses the existing thread subject</p>}
          <p className="mt-3 whitespace-pre-wrap text-sm">{template.body_template}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Placeholders: {placeholders.map((value) => `{{${value}}}`).join(", ")}
        </p>
        <form action={cloneAction} className="flex flex-wrap gap-2">
          <input name="sourceTemplateId" type="hidden" value={template.id} />
          <Input
            className="min-w-64 flex-1"
            defaultValue={`${template.name} — next version`}
            name="name"
            required
          />
          <Button disabled={clonePending} type="submit" variant="outline">
            {clonePending ? "Cloning…" : "Create editable version"}
          </Button>
        </form>
        <Feedback state={cloneState} />
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <form action={updateAction} className="grid gap-3">
        <input name="templateId" type="hidden" value={template.id} />
        <label className="grid gap-1 text-sm">Name<Input defaultValue={template.name} name="name" required /></label>
        <label className="grid gap-1 text-sm">Subject <span className="text-xs font-normal text-muted-foreground">(optional for replies in an existing thread)</span><Input defaultValue={template.subject_template} name="subjectTemplate" /></label>
        <label className="grid gap-1 text-sm">
          Plain-text body
          <textarea className="min-h-48 rounded-md border bg-background p-3 font-mono text-sm" defaultValue={template.body_template} name="bodyTemplate" required />
        </label>
        <p className="text-xs text-muted-foreground">
          Allowed: {placeholders.map((value) => `{{${value}}}`).join(", ")}
        </p>
        <Button disabled={updatePending} type="submit" variant="outline">
          {updatePending ? "Saving…" : "Save draft"}
        </Button>
        <Feedback state={updateState} />
      </form>
      <form action={approvalAction} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <input name="templateId" type="hidden" value={template.id} />
        <p className="mb-3 text-sm text-amber-950">
          Approval makes this the active version for future communications and retires the current approved version.
        </p>
        <Button disabled={approvalPending} type="submit">
          {approvalPending ? "Approving…" : "Approve template version"}
        </Button>
        <Feedback state={approvalState} />
      </form>
    </div>
  )
}
