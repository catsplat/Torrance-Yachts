import { ArrowLeft, CheckCircle2, CircleDot, ListChecks, Plus } from "lucide-react"
import Link from "next/link"

import { GenerateBookingTasksForm, OperationalTaskForm } from "@/components/tasks/task-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveTaskAssignees, getBookingTaskChecklist, getWorkItemTasks } from "@/lib/tasks/data"
import { formatTaskDate, taskPriorityLabels, taskStatusLabels } from "@/lib/tasks/options"

const workflowGroups = [
  { title: "Compliance", matches: (code: string | null) => code?.startsWith("0.") },
  { title: "Contract", matches: (code: string | null) => code?.startsWith("1.") },
  { title: "Operations", matches: (code: string | null) => code?.startsWith("2.") },
  { title: "Payments", matches: (code: string | null) => code === "3" || code?.startsWith("4.") },
  { title: "Charter", matches: (code: string | null) => code === "5" || code === "6" },
  { title: "Follow-up", matches: (code: string | null) => code === "7" },
] as const

type Props = { params: Promise<{ id: string }> }
export default async function BookingTasksPage({ params }: Props) {
  const { id } = await params
  const [{ booking, tasks }, assignees, prerequisites] = await Promise.all([
    getBookingTaskChecklist(id), getActiveTaskAssignees(), getWorkItemTasks("booking", id),
  ])
  const completed = tasks.filter((task) => task.status === "completed").length
  return <div className="mx-auto max-w-6xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href={`/bookings/${id}`}><ArrowLeft className="size-4" />Back to {booking.reference}</Link><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Booking workflow</p><h1 className="mt-1 text-3xl font-semibold">{booking.yacht.name} checklist</h1><p className="mt-2 text-sm text-muted-foreground">{completed} of {tasks.length} tasks completed · {booking.reference}</p></div><Badge variant="outline">{formatTaskDate(booking.charter_start_date)} – {formatTaskDate(booking.charter_end_date)}</Badge></div>
    {!tasks.length ? <Card><CardHeader><CardTitle>Generate the booking workflow</CardTitle><CardDescription>This is intended for bookings created before Phase 7. New confirmations generate tasks automatically.</CardDescription></CardHeader><CardContent><GenerateBookingTasksForm bookingId={booking.id} /></CardContent></Card> : null}
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ListChecks className="size-4 text-primary" />Booking checklist</CardTitle><CardDescription>Open the next ready task. Blocked work shows exactly what it is waiting for.</CardDescription></CardHeader><CardContent className="space-y-6 p-5">{tasks.length ? <>{workflowGroups.map((group) => { const grouped = tasks.filter((task) => group.matches(task.step_code)); if (!grouped.length) return null; return <section key={group.title}><h2 className="mb-2 text-sm font-semibold">{group.title}</h2><div className="divide-y rounded-lg border">{grouped.map((task) => <Link className="grid gap-3 px-4 py-3 hover:bg-muted/40 sm:grid-cols-[2rem_minmax(0,1fr)_auto]" href={`/tasks/${task.id}`} key={task.id}><div className="flex items-start justify-center pt-0.5">{task.status === "completed" ? <CheckCircle2 className="size-5 text-emerald-700" /> : <CircleDot className={task.status === "ready" ? "size-5 text-primary" : "size-5 text-muted-foreground"} />}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{task.step_code ? `${task.step_code} · ` : ""}{task.title}</p><Badge variant={task.status === "ready" ? "default" : "outline"}>{taskStatusLabels[task.status]}</Badge>{!task.required ? <Badge variant="secondary">Optional</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{task.blocked_reason ?? `${task.assignee?.display_name ?? "Unassigned"} · ${taskPriorityLabels[task.priority]}`}</p></div><p className="text-sm font-medium">{formatTaskDate(task.due_date)}</p></Link>)}</div></section> })}{tasks.some((task) => !workflowGroups.some((group) => group.matches(task.step_code))) ? <section><h2 className="mb-2 text-sm font-semibold">Additional work</h2><div className="divide-y rounded-lg border">{tasks.filter((task) => !workflowGroups.some((group) => group.matches(task.step_code))).map((task) => <Link className="grid gap-3 px-4 py-3 hover:bg-muted/40 sm:grid-cols-[2rem_minmax(0,1fr)_auto]" href={`/tasks/${task.id}`} key={task.id}><div className="flex items-start justify-center pt-0.5">{task.status === "completed" ? <CheckCircle2 className="size-5 text-emerald-700" /> : <CircleDot className={task.status === "ready" ? "size-5 text-primary" : "size-5 text-muted-foreground"} />}</div><div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.blocked_reason ?? `${task.assignee?.display_name ?? "Unassigned"} · ${taskPriorityLabels[task.priority]}`}</p></div><p className="text-sm font-medium">{formatTaskDate(task.due_date)}</p></Link>)}</div></section> : null}</> : <p className="py-12 text-center text-sm text-muted-foreground">No generated tasks.</p>}</CardContent></Card>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" />Add task</CardTitle><CardDescription>Add work, choose any conditions, then let the checklist show what is ready next.</CardDescription></CardHeader><CardContent className="pt-5"><OperationalTaskForm assignees={assignees} prerequisites={prerequisites} workId={booking.id} workType="booking" /></CardContent></Card>
  </div>
}
