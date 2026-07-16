import { AlertTriangle, CheckCircle2, Clock3, ListChecks, Search, Settings2 } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTaskRegister } from "@/lib/tasks/data"
import {
  formatTaskDate,
  taskDueState,
  taskPriorityLabels,
  taskPriorityValues,
  taskStatusLabels,
  taskStatusValues,
} from "@/lib/tasks/options"
import { cn } from "@/lib/utils"

type Props = {
  searchParams: Promise<{
    q?: string; status?: string; priority?: string; due?: string; assignee?: string
  }>
}

export default async function TasksPage({ searchParams }: Props) {
  const filters = await searchParams
  const tasks = await getTaskRegister()
  const search = filters.q?.trim().toLocaleLowerCase("en-GB").slice(0, 160) ?? ""
  const status = taskStatusValues.includes(filters.status as typeof taskStatusValues[number])
    ? filters.status! : ""
  const priority = taskPriorityValues.includes(filters.priority as typeof taskPriorityValues[number])
    ? filters.priority! : ""
  const visible = tasks.filter((task) => {
    const dueState = taskDueState(task.due_date, task.status)
    const matchesSearch = !search || [
      task.reference, task.step_code ?? "", task.title,
      task.booking.reference, task.booking.yacht.name,
    ].some((value) => value.toLocaleLowerCase("en-GB").includes(search))
    return matchesSearch &&
      (!status || task.status === status) &&
      (!priority || task.priority === priority) &&
      (!filters.due || dueState === filters.due) &&
      (!filters.assignee || (filters.assignee === "unassigned"
        ? !task.assigned_user_id : task.assigned_user_id === filters.assignee))
  })
  const ready = visible.filter((task) => task.status === "ready").length
  const blocked = visible.filter((task) => task.status === "blocked").length
  const overdue = visible.filter((task) => taskDueState(task.due_date, task.status) === "overdue").length
  const assignees = Array.from(new Map(
    tasks.filter((task) => task.assigned_user_id && task.assignee)
      .map((task) => [task.assigned_user_id!, task.assignee!.display_name]),
  ))

  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operational control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Tasks</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Dependency-aware booking work, reviewed schedules, assignees, completion evidence, and permanent reopening history.</p></div><Link className={cn(buttonVariants({ variant: "outline" }))} href="/tasks/templates"><Settings2 />Task templates</Link></div>
    <div className="grid gap-3 sm:grid-cols-4"><Metric icon={ListChecks} label="Matching tasks" value={visible.length} /><Metric icon={CheckCircle2} label="Ready" value={ready} /><Metric icon={Clock3} label="Blocked" value={blocked} /><Metric icon={AlertTriangle} label="Overdue" value={overdue} /></div>
    <Card><CardHeader className="border-b"><CardTitle>Task register</CardTitle><CardDescription>Search and filter up to 1,000 authorised operational records.</CardDescription></CardHeader><CardContent className="pt-5"><form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_9rem_12rem_auto]" method="get"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search tasks" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={filters.q} name="q" placeholder="Task, booking or yacht" /></label><Select name="status" value={status} label="Status"><option value="">All states</option>{taskStatusValues.map((value) => <option key={value} value={value}>{taskStatusLabels[value]}</option>)}</Select><Select name="priority" value={priority} label="Priority"><option value="">All priorities</option>{taskPriorityValues.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}</Select><Select name="due" value={filters.due ?? ""} label="Due state"><option value="">Any date</option><option value="overdue">Overdue</option><option value="today">Today</option><option value="future">Future</option><option value="none">No active date</option></Select><Select name="assignee" value={filters.assignee ?? ""} label="Assignee"><option value="">Anyone</option><option value="unassigned">Unassigned</option>{assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply</button></form></CardContent></Card>
    <Card><CardContent className="p-0">{visible.length ? <div className="divide-y">{visible.map((task) => <Link className="block px-5 py-4 hover:bg-muted/40" href={`/tasks/${task.id}`} key={task.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{task.step_code ? `${task.step_code} · ` : ""}{task.title}</p><Badge variant={task.status === "ready" ? "default" : "outline"}>{taskStatusLabels[task.status]}</Badge>{taskDueState(task.due_date, task.status) === "overdue" ? <Badge className="border-rose-300 bg-rose-50 text-rose-900" variant="outline">Overdue</Badge> : null}{!task.required ? <Badge variant="secondary">Optional</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{task.reference} · {task.booking.reference} · {task.booking.yacht.name}</p>{task.blocked_reason ? <p className="mt-2 text-xs text-amber-800">{task.blocked_reason}</p> : null}</div><div className="text-right"><p className="text-sm font-medium">{formatTaskDate(task.due_date)}</p><p className="mt-1 text-xs text-muted-foreground">{task.assignee?.display_name ?? "Unassigned"} · {taskPriorityLabels[task.priority]}</p></div></div></Link>)}</div> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">No matching tasks.</p>}</CardContent></Card>
  </div>
}

function Metric({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: number }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card> }
function Select({ name, value, label, children }: { name: string; value: string; label: string; children: React.ReactNode }) { return <select aria-label={label} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={value} name={name}>{children}</select> }
