import { ArrowLeft, GitBranch, LockKeyhole } from "lucide-react"
import Link from "next/link"

import { ApproveTaskTemplateForm, DeleteTemplateStepForm, NewTemplateStepForm, TemplateStepForm } from "@/components/tasks/task-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getTaskTemplateDetail } from "@/lib/tasks/data"
import { taskDueAnchorLabels } from "@/lib/tasks/options"

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
export default async function TaskTemplateDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const notice = await searchParams
  const [{ template, steps, dependencies }, user] = await Promise.all([
    getTaskTemplateDetail(id), getCurrentUser(),
  ])
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const editable = template.status === "draft" && user?.role === "administrator"
  return <div className="mx-auto max-w-6xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/tasks/templates"><ArrowLeft className="size-4" />Back to templates</Link>{notice.created ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Editable template version created.</div> : null}<div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Versioned workflow</p><h1 className="mt-1 text-3xl font-semibold">{template.name} · v{template.version_number}</h1><p className="mt-2 text-sm text-muted-foreground">{template.description}</p></div><div className="flex gap-2"><Badge>{template.status}</Badge>{template.is_default ? <Badge className="bg-emerald-700">Default</Badge> : null}</div></div>{editable ? <ApproveTaskTemplateForm templateId={template.id} /> : <Card><CardContent className="flex items-center gap-3 pt-5"><LockKeyhole className="size-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">{template.status === "draft" ? "Administrator access is required to edit this draft." : "Approved and retired versions are immutable. Clone an approved template to make changes."}</p></CardContent></Card>}
    {editable ? <Card><CardHeader className="border-b"><CardTitle>Add workflow step</CardTitle><CardDescription>Create the step first, then configure its prerequisites below.</CardDescription></CardHeader><CardContent className="pt-5"><NewTemplateStepForm nextSortOrder={(steps.at(-1)?.sort_order ?? 0) + 10} templateId={template.id} /></CardContent></Card> : null}
    <div className="space-y-4">{steps.map((step) => { const parentIds = dependencies.filter((dependency) => dependency.step_id === step.id).map((dependency) => dependency.depends_on_step_id); const parents = parentIds.map((parentId) => stepById.get(parentId)).filter(Boolean); return <Card key={step.id}><CardHeader className="border-b"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{step.step_code} · {step.title}</CardTitle><CardDescription className="mt-1">{parents.length ? <span className="flex items-center gap-1"><GitBranch className="size-3.5" />Requires {parents.map((parent) => parent!.step_code).join(", ")}</span> : "No prerequisite"}</CardDescription></div><div className="flex gap-2"><Badge variant="outline">{taskDueAnchorLabels[step.due_anchor]}{step.due_offset_days ? ` ${step.due_offset_days > 0 ? "+" : ""}${step.due_offset_days}d` : ""}</Badge>{!step.required ? <Badge variant="secondary">Optional</Badge> : null}</div></div></CardHeader><CardContent className="pt-5">{editable ? <><TemplateStepForm allSteps={steps} dependsOnIds={parentIds} step={step} templateId={template.id} />{!step.auto_complete_on_generation ? <DeleteTemplateStepForm stepId={step.id} templateId={template.id} /> : null}</> : <div className="grid gap-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Description</p><p className="mt-1">{step.description ?? "None"}</p></div><div><p className="text-xs text-muted-foreground">Reminder</p><p className="mt-1">{step.reminder_lead_days === null ? "None" : `${step.reminder_lead_days} days before`}</p></div><div><p className="text-xs text-muted-foreground">Escalation</p><p className="mt-1">{step.escalation_after_days === null ? "None" : `${step.escalation_after_days} days after`}</p></div></div>}</CardContent></Card> })}</div>
  </div>
}
