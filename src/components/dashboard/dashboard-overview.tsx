import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  ListChecks,
  Plus,
  Ship,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const taskTones = {
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-100",
  danger: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/45 dark:text-rose-100",
  ready: "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-700/60 dark:bg-teal-950/45 dark:text-teal-100",
  neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
}

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
    weekday: "long",
    year: "numeric",
  }).format(new Date())
}

type Props = {
  aiSummary: { pendingReview: number }
  integrationSummary: { failedDeliveries: number; pendingApproval: number }
  displayName: string
  enquirySummary: {
    needsResponse: number
    openCount: number
    pipeline: Array<{ label: string; tone: string; value: number }>
  }
  offerSummary: { approvedNotSent: number; awaitingApproval: number }
  bookingSummary: {
    activeCount: number
    yachtfolioPending: number
    upcoming: Array<{
      endDate: string
      id: string
      reference: string
      startDate: string
      status: string
      yacht: string
    }>
  }
  taskSummary: {
    openCount: number
    overdueCount: number
    priorities: Array<{
      context: string
      due: string
      id: string
      status: string
      title: string
      tone: keyof typeof taskTones
    }>
  }
  documentSummary: {
    awaitingReview: number
    missingRequired: number
    paymentsDue: number
  }
  emailSummary: { relevantReceived: number; reviewRequired: number }
}

export function DashboardOverview(props: Props) {
  const firstName = props.displayName.split(/\s+/)[0] || props.displayName
  const workQueue = [
    {
      detail: `${props.emailSummary.relevantReceived} received · ${props.aiSummary.pendingReview} extracted`,
      href: "/emails",
      icon: Inbox,
      label: "Inbox",
      value: props.emailSummary.reviewRequired + props.aiSummary.pendingReview,
    },
    {
      detail: `${props.enquirySummary.openCount} open`,
      href: "/enquiries",
      icon: ArrowRight,
      label: "Enquiries",
      value: props.enquirySummary.needsResponse,
    },
    {
      detail: `${props.offerSummary.approvedNotSent} ready to send`,
      href: "/offers",
      icon: FileText,
      label: "Offers",
      value: props.offerSummary.awaitingApproval,
    },
    {
      detail: `${props.taskSummary.openCount} open`,
      href: "/tasks",
      icon: ListChecks,
      label: "Tasks",
      value: props.taskSummary.overdueCount,
    },
  ]
  const systemAttention = props.integrationSummary.failedDeliveries
    + props.integrationSummary.pendingApproval

  return (
    <div className="mx-auto max-w-[88rem] space-y-6" data-tutorial-anchor="dashboard-overview">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatToday()}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Good morning, {firstName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/emails" className={buttonVariants({ variant: "outline" })}>
            <Inbox aria-hidden="true" />
            Inbox
          </Link>
          <Link href="/enquiries/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            New enquiry
          </Link>
        </div>
      </section>

      {systemAttention ? (
        <Link
          className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100"
          href="/integrations"
        >
          <span>{systemAttention} communication item{systemAttention === 1 ? "" : "s"} need attention</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}

      <section aria-labelledby="queue-heading" className="space-y-3">
        <h2 id="queue-heading" className="text-base font-semibold">Needs attention</h2>
        <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4">
          {workQueue.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                className={cn(
                  "group flex items-center gap-3 p-4 transition-colors hover:bg-muted/45",
                  index > 0 && "border-t sm:border-l sm:border-t-0",
                  index === 2 && "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0",
                )}
                href={item.href}
                key={item.label}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <strong className={cn("text-2xl tabular-nums", item.value ? "text-foreground" : "text-muted-foreground/55")}>
                  {item.value}
                </strong>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Today&apos;s tasks</CardTitle>
            <CardAction>
              <Link href="/tasks" className={buttonVariants({ size: "sm", variant: "ghost" })}>
                View all <ArrowRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y px-0">
            {props.taskSummary.priorities.length ? props.taskSummary.priorities.map((task) => (
              <Link
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{task.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.context}</span>
                </span>
                <span className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {task.due}
                  </span>
                  <Badge variant="outline" className={cn("min-w-fit", taskTones[task.tone])}>
                    {task.status}
                  </Badge>
                </span>
              </Link>
            )) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing due.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Upcoming charters</CardTitle>
            <CardAction>
              <Link aria-label="Open calendar" className={buttonVariants({ size: "icon-sm", variant: "ghost" })} href="/calendar">
                <CalendarCheck2 aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1 px-0">
            {props.bookingSummary.upcoming.length ? props.bookingSummary.upcoming.map((item, index) => (
              <div key={item.id}>
                <Link className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 px-4 py-3.5 hover:bg-muted/40" href={`/bookings/${item.id}`}>
                  <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${item.startDate}T00:00:00Z`))}
                  </p>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <Ship aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{item.yacht}</span>
                    </span>
                    <span className="mt-1 block text-sm">{item.reference}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.startDate} to {item.endDate}
                    </span>
                  </span>
                </Link>
                {index < props.bookingSummary.upcoming.length - 1 ? <Separator /> : null}
              </div>
            )) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No upcoming charters.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)]">
        <Card>
          <CardHeader className="border-b"><CardTitle>Enquiry pipeline</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {props.enquirySummary.pipeline.map((stage) => (
              <Link className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/40" href="/enquiries" key={stage.label}>
                <span className="text-sm text-muted-foreground">{stage.label}</span>
                <strong className="tabular-nums">{stage.value}</strong>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b"><CardTitle>Booking checks</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {[
              ["Missing documents", props.documentSummary.missingRequired],
              ["Documents to review", props.documentSummary.awaitingReview],
              ["Payments scheduled", props.documentSummary.paymentsDue],
              ["Yachtfolio updates", props.bookingSummary.yachtfolioPending],
            ].map(([label, value]) => (
              <Link className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40" href={label === "Yachtfolio updates" ? "/tasks" : "/documents"} key={label}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <strong className="tabular-nums">{value}</strong>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
