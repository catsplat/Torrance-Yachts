"use client"

import { useActionState } from "react"

import {
  addAdHocTaskAction,
  addTaskTemplateStepAction,
  addTaskNoteAction,
  approveTaskTemplateAction,
  cancelAdHocTaskAction,
  cloneTaskTemplateAction,
  completeTaskAction,
  deleteTaskTemplateStepAction,
  generateBookingTasksAction,
  prepareTaskCommunicationAction,
  reopenTaskAction,
  type TaskActionState,
  updateTaskScheduleAction,
  updateTaskTemplateStepAction,
} from "@/app/(workspace)/tasks/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  taskDueAnchorLabels,
  taskDueAnchorValues,
  taskPriorityLabels,
  taskPriorityValues,
} from "@/lib/tasks/options"

const initialState: TaskActionState = {}

function Feedback({ state }: { state: TaskActionState }) {
  return <p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p>
}

export function TaskStateForm({
  taskId,
  mode,
}: {
  taskId: string
  mode: "complete" | "reopen" | "cancel"
}) {
  const handler = mode === "complete"
    ? completeTaskAction
    : mode === "reopen"
      ? reopenTaskAction
      : cancelAdHocTaskAction
  const [state, action, pending] = useActionState(handler.bind(null, taskId), initialState)
  const label = mode === "complete" ? "Complete task" : mode === "reopen" ? "Reopen task" : "Cancel ad-hoc task"
  return <form action={action} className="space-y-3 rounded-xl border p-4">
    <label className="space-y-1.5 text-xs font-medium">
      {mode === "complete" ? "Completion evidence" : "Reason"}
      <textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={2000} name="reason" required />
    </label>
    <Feedback state={state} />
    <Button className="w-full" disabled={pending} type="submit" variant={mode === "cancel" ? "destructive" : mode === "reopen" ? "outline" : "default"}>
      {pending ? "Recording…" : label}
    </Button>
  </form>
}

export function TaskScheduleForm({
  taskId,
  dueDate,
  priority,
  assignedUserId,
  assignees,
}: {
  taskId: string
  dueDate: string | null
  priority: (typeof taskPriorityValues)[number]
  assignedUserId: string | null
  assignees: { id: string; display_name: string }[]
}) {
  const [state, action, pending] = useActionState(updateTaskScheduleAction.bind(null, taskId), initialState)
  return <form action={action} className="grid gap-3 sm:grid-cols-2">
    <Field label="Due date"><Input defaultValue={dueDate ?? ""} name="due_date" type="date" /></Field>
    <Field label="Priority"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue={priority} name="priority">{taskPriorityValues.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</select></Field>
    <Field label="Assignee"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue={assignedUserId ?? ""} name="assigned_user_id"><option value="">Unassigned</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select></Field>
    <Field label="Recorded reason"><Input maxLength={2000} name="reason" required /></Field>
    <div className="flex items-center justify-between gap-3 sm:col-span-2"><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save schedule"}</Button></div>
  </form>
}

export function TaskNoteForm({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState(addTaskNoteAction.bind(null, taskId), initialState)
  return <form action={action} className="space-y-3"><textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={10000} name="body" placeholder="Add a permanent operational note" required /><div className="flex items-center justify-between gap-3"><Feedback state={state} /><Button disabled={pending} type="submit" variant="outline">{pending ? "Adding…" : "Add note"}</Button></div></form>
}

export function TaskCommunicationForm({
  stepCode,
  taskId,
}: {
  stepCode: string
  taskId: string
}) {
  const [state, action, pending] = useActionState(
    prepareTaskCommunicationAction.bind(null, taskId),
    initialState,
  )
  const destination = stepCode === "2.B"
    ? "a reviewable Gmail draft for the primary captain"
    : "a reviewable Telegram draft for you"
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Prepare {destination} from approved templates and authoritative booking
        contacts. Nothing is sent by this action.
      </p>
      <Input
        name="reason"
        placeholder="Why this communication is being prepared"
        required
      />
      <Feedback state={state} />
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Preparing…" : "Prepare reviewable communication"}
      </Button>
    </form>
  )
}

export function AdHocTaskForm({
  bookingId,
  assignees,
}: {
  bookingId: string
  assignees: { id: string; display_name: string }[]
}) {
  const [state, action, pending] = useActionState(addAdHocTaskAction, initialState)
  return <form action={action} className="grid gap-3 sm:grid-cols-2">
    <input name="booking_id" type="hidden" value={bookingId} />
    <Field label="Task title"><Input maxLength={240} name="title" required /></Field>
    <Field label="Due date"><Input name="due_date" type="date" /></Field>
    <Field label="Priority"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue="normal" name="priority">{taskPriorityValues.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</select></Field>
    <Field label="Assignee"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue="" name="assigned_user_id"><option value="">Unassigned</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select></Field>
    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Description<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={5000} name="description" /></label>
    <div className="flex items-center justify-between gap-3 sm:col-span-2"><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add ad-hoc task"}</Button></div>
  </form>
}

export function GenerateBookingTasksForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(generateBookingTasksAction.bind(null, bookingId), initialState)
  return <form action={action} className="space-y-3"><p className="text-sm text-muted-foreground">Apply the approved default workflow once. Retrying is safe and will not duplicate tasks.</p><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Generating…" : "Generate booking tasks"}</Button></form>
}

export function CloneTaskTemplateForm({ templateId, name }: { templateId: string; name: string }) {
  const [state, action, pending] = useActionState(cloneTaskTemplateAction, initialState)
  return <form action={action} className="space-y-3"><input name="source_template_id" type="hidden" value={templateId} /><Field label="New version name"><Input defaultValue={name} maxLength={160} name="name" required /></Field><Feedback state={state} /><Button disabled={pending} type="submit" variant="outline">{pending ? "Cloning…" : "Create editable version"}</Button></form>
}

export function ApproveTaskTemplateForm({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState(approveTaskTemplateAction.bind(null, templateId), initialState)
  return <form action={action} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-950">Approval makes this version the default for every newly confirmed booking and retires the current default.</p><input name="reason" type="hidden" value="Reviewed and approved task-template version" /><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Approving…" : "Approve as default workflow"}</Button></form>
}

type StepValues = {
  id: string; title: string; description: string | null
  priority: (typeof taskPriorityValues)[number]; required: boolean
  due_anchor: (typeof taskDueAnchorValues)[number]; due_offset_days: number
  due_date_required: boolean; reminder_lead_days: number | null
  escalation_after_days: number | null
}
export function TemplateStepForm({
  templateId,
  step,
  allSteps,
  dependsOnIds,
}: {
  templateId: string
  step: StepValues
  allSteps: { id: string; step_code: string; title: string }[]
  dependsOnIds: string[]
}) {
  const [state, action, pending] = useActionState(updateTaskTemplateStepAction.bind(null, step.id, templateId), initialState)
  return <form action={action} className="grid gap-3 sm:grid-cols-2">
    <Field label="Title"><Input defaultValue={step.title} maxLength={240} name="title" required /></Field>
    <Field label="Priority"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue={step.priority} name="priority">{taskPriorityValues.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</select></Field>
    <Field label="Date source"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue={step.due_anchor} name="due_anchor">{taskDueAnchorValues.map((value) => <option key={value} value={value}>{taskDueAnchorLabels[value]}</option>)}</select></Field>
    <Field label="Day offset"><Input defaultValue={step.due_offset_days} max={365} min={-365} name="due_offset_days" required type="number" /></Field>
    <Field label="Reminder lead days"><Input defaultValue={step.reminder_lead_days ?? ""} max={365} min={0} name="reminder_lead_days" type="number" /></Field>
    <Field label="Escalate after days"><Input defaultValue={step.escalation_after_days ?? ""} max={365} min={0} name="escalation_after_days" type="number" /></Field>
    <label className="flex items-center gap-2 text-sm"><input defaultChecked={step.required} name="required" type="checkbox" />Required task</label>
    <label className="flex items-center gap-2 text-sm"><input defaultChecked={step.due_date_required} name="due_date_required" type="checkbox" />Date must be resolved</label>
    <fieldset className="space-y-2 rounded-lg border p-3 sm:col-span-2"><legend className="px-1 text-xs font-medium">Prerequisite steps</legend><div className="grid gap-2 sm:grid-cols-2">{allSteps.filter((candidate) => candidate.id !== step.id).map((candidate) => <label className="flex items-start gap-2 text-sm" key={candidate.id}><input className="mt-1" defaultChecked={dependsOnIds.includes(candidate.id)} name="depends_on_step_ids" type="checkbox" value={candidate.id} /><span><strong>{candidate.step_code}</strong> · {candidate.title}</span></label>)}</div></fieldset>
    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Description<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={step.description ?? ""} maxLength={5000} name="description" /></label>
    <div className="flex items-center justify-between gap-3 sm:col-span-2"><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save draft step"}</Button></div>
  </form>
}

export function NewTemplateStepForm({ templateId, nextSortOrder }: { templateId: string; nextSortOrder: number }) {
  const [state, action, pending] = useActionState(addTaskTemplateStepAction.bind(null, templateId), initialState)
  return <form action={action} className="grid gap-3 sm:grid-cols-2"><input name="template_id" type="hidden" value={templateId} /><Field label="Step code"><Input maxLength={20} name="step_code" placeholder="8.A" required /></Field><Field label="Title"><Input maxLength={240} name="title" required /></Field><Field label="Priority"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue="normal" name="priority">{taskPriorityValues.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</select></Field><Field label="Sort order"><Input defaultValue={nextSortOrder} max={10000} min={0} name="sort_order" required type="number" /></Field><Field label="Date source"><select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue="none" name="due_anchor">{taskDueAnchorValues.map((value) => <option key={value} value={value}>{taskDueAnchorLabels[value]}</option>)}</select></Field><Field label="Day offset"><Input defaultValue={0} max={365} min={-365} name="due_offset_days" required type="number" /></Field><Field label="Reminder lead days"><Input max={365} min={0} name="reminder_lead_days" type="number" /></Field><Field label="Escalate after days"><Input max={365} min={0} name="escalation_after_days" type="number" /></Field><label className="flex items-center gap-2 text-sm"><input defaultChecked name="required" type="checkbox" />Required task</label><label className="flex items-center gap-2 text-sm"><input name="due_date_required" type="checkbox" />Date must be resolved</label><label className="space-y-1.5 text-xs font-medium sm:col-span-2">Description<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={5000} name="description" /></label><div className="flex items-center justify-between gap-3 sm:col-span-2"><Feedback state={state} /><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add step to draft"}</Button></div></form>
}

export function DeleteTemplateStepForm({ stepId, templateId }: { stepId: string; templateId: string }) {
  const [state, action, pending] = useActionState(deleteTaskTemplateStepAction.bind(null, stepId, templateId), initialState)
  return <form action={action} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><input name="reason" type="hidden" value="Removed from draft task-template version" /><Feedback state={state} /><Button disabled={pending} type="submit" variant="destructive">{pending ? "Removing…" : "Remove draft step"}</Button></form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-xs font-medium">{label}{children}</label>
}
