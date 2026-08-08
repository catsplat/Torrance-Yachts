import { ArrowLeft, CheckCircle2, CircleDot, ListChecks, Plus } from "lucide-react"
import Link from "next/link"

import { AdHocTaskForm, GenerateBookingTasksForm } from "@/components/tasks/task-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveTaskAssignees, getBookingTaskChecklist } from "@/lib/tasks/data"
import { formatTaskDate, taskPriorityLabels, taskStatusLabels } from "@/lib/tasks/options"

type Props = { params: Promise<{ id: string }> }
export default async function BookingTasksPage({ params }: Props) {
  const { id } = await params
  const [{ booking, tasks }, assignees] = await Promise.all([
    getBookingTaskChecklist(id), getActiveTaskAssignees(),
  ])
  const completed = tasks.filter((task) => task.status === "completed").length
  return <div className="mx-auto max-w-6xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href={`/bookings/${id}`}><ArrowLeft className="size-4" />Back to {booking.reference}</Link><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Booking workflow</p><h1 className="mt-1 text-3xl font-semibold">{booking.yacht.name} checklist</h1><p className="mt-2 text-sm text-muted-foreground">{completed} of {tasks.length} tasks completed · {booking.reference}</p></div><Badge variant="outline">{formatTaskDate(booking.charter_start_date)} – {formatTaskDate(booking.charter_end_date)}</Badge></div>
    {!tasks.length ? <Card><CardHeader><CardTitle>Generate the booking workflow</CardTitle><CardDescription>This is intended for bookings created before Phase 7. New confirmations generate tasks automatically.</CardDescription></CardHeader><CardContent><GenerateBookingTasksForm bookingId={booking.id} /></CardContent></Card> : null}
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ListChecks className="size-4 text-primary" />Dependency-aware sequence</CardTitle><CardDescription>Blocked steps unlock only when every prerequisite and required date is satisfied.</CardDescription></CardHeader><CardContent className="p-0">{tasks.length ? <div className="divide-y">{tasks.map((task) => <Link className="grid gap-3 px-5 py-4 hover:bg-muted/40 sm:grid-cols-[2rem_minmax(0,1fr)_auto]" href={`/tasks/${task.id}`} key={task.id}><div className="flex items-start justify-center pt-0.5">{task.status === "completed" ? <CheckCircle2 className="size-5 text-emerald-700" /> : <CircleDot className={task.status === "ready" ? "size-5 text-primary" : "size-5 text-muted-foreground"} />}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{task.step_code ? `${task.step_code} · ` : ""}{task.title}</p><Badge variant={task.status === "ready" ? "default" : "outline"}>{taskStatusLabels[task.status]}</Badge>{!task.required ? <Badge variant="secondary">Optional</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{task.blocked_reason ?? `${task.assignee?.display_name ?? "Unassigned"} · ${taskPriorityLabels[task.priority]}`}</p></div><p className="text-sm font-medium">{formatTaskDate(task.due_date)}</p></Link>)}</div> : <p className="px-5 py-12 text-center text-sm text-muted-foreground">No generated tasks.</p>}</CardContent></Card>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Plus className="size-4 text-primary" />Add task</CardTitle><CardDescription>Add work specific to this booking.</CardDescription></CardHeader><CardContent className="pt-5"><AdHocTaskForm assignees={assignees} bookingId={booking.id} /></CardContent></Card>
  </div>
}
