import {
  ArrowRight,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
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
  CardDescription,
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
  const largestPipelineStage = Math.max(
    1,
    ...props.enquirySummary.pipeline.map((stage) => stage.value),
  )
  const attention = [
    {
      detail: `${props.emailSummary.relevantReceived} relevant messages`,
      href: "/emails",
      icon: Inbox,
      label: "Inbox review",
      value: props.emailSummary.reviewRequired,
    },
    {
      detail: "Suggestions awaiting a person",
      href: "/ai/review",
      icon: BrainCircuit,
      label: "AI review",
      value: props.aiSummary.pendingReview,
    },
    {
      detail: `${props.enquirySummary.openCount} open enquiries`,
      href: "/enquiries",
      icon: ArrowRight,
      label: "Enquiry replies",
      value: props.enquirySummary.needsResponse,
    },
    {
      detail: `${props.offerSummary.approvedNotSent} approved, not sent`,
      href: "/offers",
      icon: FileCheck2,
      label: "Offer approvals",
      value: props.offerSummary.awaitingApproval,
    },
    {
      detail: `${props.taskSummary.openCount} open tasks`,
      href: "/tasks",
      icon: ListChecks,
      label: "Overdue operations",
      value: props.taskSummary.overdueCount,
    },
    {
      detail: `${props.integrationSummary.pendingApproval} external alerts await approval`,
      href: "/integrations",
      icon: FileWarning,
      label: "Delivery failures",
      value: props.integrationSummary.failedDeliveries,
    },
  ]
  return (
    <div className="mx-auto max-w-[88rem] space-y-8" data-tutorial-anchor="dashboard-overview">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Daily operations</Badge>
            <span className="text-xs text-muted-foreground">{formatToday()}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Good morning, {props.displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Work from left to right: review new mail, progress enquiries and offers,
            then run booked-charter operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/emails" className={buttonVariants({ size: "lg", variant: "outline" })}>
            <Inbox aria-hidden="true" />
            Review inbox
          </Link>
          <Link href="/enquiries/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" />
            New enquiry
          </Link>
        </div>
      </section>

      <section aria-labelledby="attention-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="attention-heading" className="text-base font-semibold">Action queue</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">The next human decisions across the charter workflow.</p>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">Live operational data</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {attention.map((item) => {
            const Icon = item.icon
            return (
              <Link
                className="group flex items-center gap-3 rounded-xl border border-border/90 bg-card p-3.5 shadow-[0_1px_2px_oklch(0.2_0.03_235_/_0.035)] transition-[background-color,border-color,box-shadow] duration-150 hover:border-primary/35 hover:bg-accent/35 hover:shadow-sm dark:shadow-none"
                href={item.href}
                key={item.label}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <strong className={cn("text-xl leading-none", item.value ? "text-foreground" : "text-muted-foreground")}>
                  {item.value}
                  </strong>
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {item.value === 1 ? "action" : "actions"}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border/90 bg-card px-3 py-2.5 shadow-[0_1px_2px_oklch(0.2_0.03_235_/_0.035)] dark:shadow-none" aria-label="Daily workflow">
        <div className="flex min-w-[45rem] items-center">
          {[
            ["Inbox", "/emails"],
            ["Enquiry", "/enquiries"],
            ["Offer", "/offers"],
            ["Booking", "/bookings"],
            ["Operations", "/tasks"],
            ["Follow-up", "/tasks"],
          ].map(([label, href], index, values) => (
            <div className="contents" key={label}>
              <Link className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent" href={href}>
                <span className="mr-2 text-xs text-muted-foreground">{index + 1}</span>
                {label}
              </Link>
              {index < values.length - 1 ? <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Today&apos;s operational priorities</CardTitle>
            <CardDescription>Due tasks ordered by urgency, dependency, and date.</CardDescription>
            <CardAction>
              <Link href="/tasks" className={buttonVariants({ size: "sm", variant: "ghost" })}>
                All operations
                <ArrowRight aria-hidden="true" />
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
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No active task priorities.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Upcoming charters</CardTitle>
            <CardDescription>
              {props.bookingSummary.activeCount} active · {props.bookingSummary.yachtfolioPending} Yachtfolio actions pending
            </CardDescription>
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
                      {item.startDate} to {item.endDate} · {item.status}
                    </span>
                  </span>
                </Link>
                {index < props.bookingSummary.upcoming.length - 1 ? <Separator /> : null}
              </div>
            )) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No upcoming confirmed charters.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Enquiry pipeline</CardTitle>
            <CardDescription>Open requests from first contact to signed-contract review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.enquirySummary.pipeline.map((stage) => (
              <div key={stage.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground">{stage.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", stage.tone)}
                    style={{ width: `${Math.round((stage.value / largestPipelineStage) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Booking readiness</CardTitle>
            <CardDescription>Compliance, payments, and document gates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["Missing required documents", props.documentSummary.missingRequired],
              ["Documents awaiting review", props.documentSummary.awaitingReview],
              ["Scheduled payments", props.documentSummary.paymentsDue],
            ].map(([label, value]) => (
              <Link className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent" href="/documents" key={label}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <strong className="text-xl">{value}</strong>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
