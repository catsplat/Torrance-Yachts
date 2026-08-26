import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatTaskDate, taskDueState, taskStatusLabels } from "@/lib/tasks/options";
import { redirect } from "next/navigation";
import { z } from "zod";

const dashboardSummarySchema = z.object({
  ai: z.object({ pending_review: z.coerce.number() }),
  bookings: z.object({ active: z.coerce.number(), yachtfolio_pending: z.coerce.number() }),
  documents: z.object({ awaiting_review: z.coerce.number(), missing_required: z.coerce.number() }),
  email: z.object({ relevant_received: z.coerce.number(), review_required: z.coerce.number() }),
  enquiries: z.object({
    awaiting_signatures: z.coerce.number(), contract_issued: z.coerce.number(),
    negotiating: z.coerce.number(), new: z.coerce.number(), offer_sent: z.coerce.number(),
    open: z.coerce.number(), waiting_for_reply: z.coerce.number(),
  }),
  integrations: z.object({ failed_deliveries: z.coerce.number(), pending_approval: z.coerce.number() }),
  offers: z.object({ approved_not_sent: z.coerce.number(), awaiting_approval: z.coerce.number() }),
  payments: z.object({ scheduled: z.coerce.number() }),
  tasks: z.object({ open: z.coerce.number(), overdue: z.coerce.number() }),
});

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const [summaryResult, bookingsResult, tasksResult] = await Promise.all([
    supabase.rpc("get_workspace_dashboard_summary"),
    supabase.from("bookings").select("id,reference,status,charter_start_date,charter_end_date,yacht:yachts!bookings_yacht_id_fkey(name),yachtfolio:yachtfolio_booking_actions!yachtfolio_booking_actions_booking_id_fkey(status)").in("status", ["confirmed", "charter_active"]).order("charter_start_date").limit(5),
    supabase.from("tasks").select("id,title,status,priority,due_date,booking:bookings!tasks_booking_id_fkey(reference,yacht:yachts!bookings_yacht_id_fkey(name))").in("status", ["ready", "blocked"]).order("due_date", { ascending: true, nullsFirst: false }).limit(50),
  ]);
  if (summaryResult.error || bookingsResult.error || tasksResult.error) throw new Error("Unable to load the live dashboard summary.");
  const parsedSummary = dashboardSummarySchema.safeParse(summaryResult.data);
  if (!parsedSummary.success) throw new Error("The dashboard summary contract is invalid.");
  const summary = parsedSummary.data;

  return (
    <DashboardOverview
      aiSummary={{ pendingReview: summary.ai.pending_review }}
      integrationSummary={{
        failedDeliveries: summary.integrations.failed_deliveries,
        pendingApproval: summary.integrations.pending_approval,
      }}
      displayName={currentUser.displayName}
      enquirySummary={{
        needsResponse:
          summary.enquiries.new + summary.enquiries.waiting_for_reply,
        openCount: summary.enquiries.open,
        pipeline: [
          { label: "New", tone: "bg-sky-500", value: summary.enquiries.new },
          {
            label: "Waiting for reply",
            tone: "bg-amber-500",
            value: summary.enquiries.waiting_for_reply,
          },
          {
            label: "Offer sent",
            tone: "bg-violet-500",
            value: summary.enquiries.offer_sent,
          },
          {
            label: "Negotiating",
            tone: "bg-teal-600",
            value: summary.enquiries.negotiating,
          },
          {
            label: "Contract issued",
            tone: "bg-indigo-500",
            value: summary.enquiries.contract_issued,
          },
          {
            label: "Awaiting signatures",
            tone: "bg-orange-500",
            value: summary.enquiries.awaiting_signatures,
          },
        ],
      }}
      offerSummary={{
        awaitingApproval: summary.offers.awaiting_approval,
        approvedNotSent: summary.offers.approved_not_sent,
      }}
      bookingSummary={{
        activeCount: summary.bookings.active,
        yachtfolioPending: summary.bookings.yachtfolio_pending,
        upcoming: bookingsResult.data.map((booking) => ({
          id: booking.id,
          reference: booking.reference,
          yacht: booking.yacht.name,
          startDate: booking.charter_start_date,
          endDate: booking.charter_end_date,
          status: booking.status,
        })),
      }}
      taskSummary={{
        openCount: summary.tasks.open,
        overdueCount: summary.tasks.overdue,
        priorities: [...tasksResult.data]
          .sort((a, b) => {
            const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
            return priority[a.priority] - priority[b.priority] ||
              (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
          })
          .slice(0, 5)
          .map((task) => {
            const dueState = taskDueState(task.due_date, task.status);
            return {
              id: task.id,
              title: task.title,
              context: task.booking ? `${task.booking.reference} · ${task.booking.yacht.name}` : "Enquiry preparation",
              due: formatTaskDate(task.due_date),
              status: taskStatusLabels[task.status],
              tone: dueState === "overdue"
                ? "danger" as const
                : task.status === "ready"
                  ? "ready" as const
                  : "warning" as const,
            };
          }),
      }}
      documentSummary={{
        missingRequired: summary.documents.missing_required,
        awaitingReview: summary.documents.awaiting_review,
        paymentsDue: summary.payments.scheduled,
      }}
      emailSummary={{
        reviewRequired: summary.email.review_required,
        relevantReceived: summary.email.relevant_received,
      }}
    />
  );
}
