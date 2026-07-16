import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileWarning,
  Inbox,
  ListChecks,
  Plus,
  Ship,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dashboardMetrics } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const metricIcons = {
  enquiries: Inbox,
  tasks: ListChecks,
  bookings: CalendarCheck2,
  documents: FileWarning,
};

const taskTones = {
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  ready: "border-teal-200 bg-teal-50 text-teal-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date());
}

type DashboardEnquirySummary = {
  needsResponse: number;
  openCount: number;
  pipeline: Array<{ label: string; tone: string; value: number }>;
};

type DashboardOfferSummary = {
  approvedNotSent: number;
  awaitingApproval: number;
};

type DashboardBookingSummary = {
  activeCount: number;
  yachtfolioPending: number;
  upcoming: Array<{ id: string; reference: string; yacht: string; startDate: string; endDate: string; status: string }>;
};

type DashboardTaskSummary = {
  openCount: number;
  overdueCount: number;
  priorities: Array<{
    id: string;
    title: string;
    context: string;
    due: string;
    status: string;
    tone: keyof typeof taskTones;
  }>;
};

type DashboardDocumentSummary = {
  awaitingReview: number;
  missingRequired: number;
  paymentsDue: number;
};

export function DashboardOverview({
  displayName,
  enquirySummary,
  offerSummary,
  bookingSummary,
  taskSummary,
  documentSummary,
}: {
  displayName: string;
  enquirySummary: DashboardEnquirySummary;
  offerSummary: DashboardOfferSummary;
  bookingSummary: DashboardBookingSummary;
  taskSummary: DashboardTaskSummary;
  documentSummary: DashboardDocumentSummary;
}) {
  const liveMetrics = dashboardMetrics.map((metric) =>
    metric.key === "enquiries"
      ? {
          ...metric,
          detail: `${enquirySummary.needsResponse} need response action`,
          trend: "Live database",
          value: String(enquirySummary.openCount),
        }
      : metric.key === "bookings"
        ? { ...metric, value: String(bookingSummary.activeCount), detail: `${bookingSummary.yachtfolioPending} Yachtfolio actions pending`, trend: "Live database" }
        : metric.key === "tasks"
          ? { ...metric, value: String(taskSummary.openCount), detail: `${taskSummary.overdueCount} overdue`, trend: "Live database" }
          : metric.key === "documents"
            ? { ...metric, value: String(documentSummary.missingRequired), detail: `${documentSummary.awaitingReview} await review · ${documentSummary.paymentsDue} payments due`, trend: "Live database" }
            : metric,
  );
  const largestPipelineStage = Math.max(
    1,
    ...enquirySummary.pipeline.map((stage) => stage.value),
  );

  return (
    <div className="mx-auto max-w-[96rem] space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Operations overview</Badge>
            <span className="text-xs text-muted-foreground">{formatToday()}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Good morning, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Here is what needs attention across enquiries and upcoming charters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tasks"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <ListChecks aria-hidden="true" />
            View tasks
          </Link>
          <Link
            href="/enquiries/new"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus aria-hidden="true" />
            New enquiry
          </Link>
        </div>
      </section>

      <section aria-labelledby="attention-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="attention-heading" className="text-sm font-semibold">
            At a glance
          </h2>
          <span className="text-xs text-muted-foreground">
            Enquiries, offers, bookings and tasks live · later modules synthetic
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {liveMetrics.map((metric) => {
            const Icon = metricIcons[metric.key];

            return (
              <Card key={metric.key} className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                  <CardAction>
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Icon aria-hidden="true" className="size-4" />
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{metric.detail}</span>
                    <span className="font-medium text-teal-700">{metric.trend}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Today&apos;s priorities</CardTitle>
            <CardDescription>
              Tasks and approvals ordered by operational urgency.
            </CardDescription>
            <CardAction>
              <Link
                href="/tasks"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                All tasks
                <ArrowRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y px-0">
            {taskSummary.priorities.length ? taskSummary.priorities.map((task) => (
              <Link
                href={`/tasks/${task.id}`}
                key={task.id}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {task.context}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {task.due}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("min-w-fit", taskTones[task.tone])}
                  >
                    {task.status}
                  </Badge>
                </div>
              </Link>
            )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No active task priorities.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Upcoming schedule</CardTitle>
            <CardDescription>Charter dates and availability holds.</CardDescription>
            <CardAction>
              <Link
                href="/calendar"
                aria-label="Open calendar"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
              >
                <CalendarCheck2 aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1 px-0">
            {bookingSummary.upcoming.length ? bookingSummary.upcoming.map((item, index) => (
              <div key={item.id}>
                <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-teal-800">
                      {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${item.startDate}T00:00:00Z`))}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Ship aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      <p className="truncate text-sm font-medium">{item.yacht}</p>
                    </div>
                    <p className="mt-1 text-sm">{item.reference}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.startDate} to {item.endDate} · {item.status}
                    </p>
                  </div>
                </div>
                {index < bookingSummary.upcoming.length - 1 && <Separator />}
              </div>
            )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No upcoming confirmed charters.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Enquiry pipeline</CardTitle>
            <CardDescription>
              Open enquiries by their current operational state.
            </CardDescription>
            <CardAction>
              <Link
                href="/enquiries"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Open enquiries
                <ArrowRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {enquirySummary.pipeline.map((stage) => (
              <div key={stage.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground">{stage.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", stage.tone)}
                    style={{
                      width: `${Math.round((stage.value / largestPipelineStage) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Offer approvals</CardTitle>
            <CardDescription>
              Human review gates from the live offer register.
            </CardDescription>
            <CardAction>
              <Link
                href="/offers"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Open offers
                <ArrowRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-amber-50 p-4 text-amber-950">
              <p className="text-3xl font-semibold">{offerSummary.awaitingApproval}</p>
              <p className="mt-1 text-sm font-medium">Drafts awaiting approval</p>
              <p className="mt-2 text-xs leading-5 text-amber-800">
                Review wording and commercial terms before locking the snapshot.
              </p>
            </div>
            <div className="rounded-xl border bg-teal-50 p-4 text-teal-950">
              <p className="text-3xl font-semibold">{offerSummary.approvedNotSent}</p>
              <p className="mt-1 text-sm font-medium">Approved, not recorded sent</p>
              <p className="mt-2 text-xs leading-5 text-teal-800">
                The application never sends these automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
