import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { phaseFourOpenStatuses } from "@/lib/enquiries/state-machine";
import { createClient } from "@/lib/supabase/server";
import { formatTaskDate, taskDueState, taskStatusLabels } from "@/lib/tasks/options";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const [enquiriesResult, offersResult, bookingsResult, tasksResult, requirementsResult, paymentsResult, emailsResult, aiResult, notificationsResult, deliveriesResult] = await Promise.all([
    supabase.from("enquiries").select("status").in("status", phaseFourOpenStatuses),
    supabase.from("offers").select("status").in("status", ["draft", "approved"]),
    supabase.from("bookings").select("id,reference,status,charter_start_date,charter_end_date,yacht:yachts!bookings_yacht_id_fkey(name),yachtfolio:yachtfolio_booking_actions!yachtfolio_booking_actions_booking_id_fkey(status)").in("status", ["confirmed", "charter_active"]).order("charter_start_date").limit(5),
    supabase.from("tasks").select("id,title,status,priority,due_date,booking:bookings!tasks_booking_id_fkey(reference,yacht:yachts!bookings_yacht_id_fkey(name))").in("status", ["ready", "blocked"]).order("due_date", { ascending: true, nullsFirst: false }).limit(1000),
    supabase.from("booking_document_requirements").select("status,required").in("status", ["missing", "uploaded"]),
    supabase.from("payment_schedules").select("status,due_date").eq("status", "scheduled"),
    supabase.from("email_messages").select("processing_status,classification")
      .in("processing_status", ["review_required", "classified", "linked"]),
    supabase.from("ai_suggestions").select("status").eq("status", "pending_review"),
    supabase.from("notifications").select("status").eq("status", "pending_approval"),
    supabase.from("integration_deliveries").select("status").eq("status", "failed"),
  ]);
  const { data: openEnquiries, error } = enquiriesResult;

  if (error || offersResult.error || bookingsResult.error || tasksResult.error || requirementsResult.error || paymentsResult.error || emailsResult.error || aiResult.error || notificationsResult.error || deliveriesResult.error) throw new Error("Unable to load the live dashboard summary.");

  const countStatus = (status: (typeof phaseFourOpenStatuses)[number]) =>
    openEnquiries.filter((enquiry) => enquiry.status === status).length;

  return (
    <DashboardOverview
      aiSummary={{ pendingReview: aiResult.data.length }}
      integrationSummary={{
        failedDeliveries: deliveriesResult.data.length,
        pendingApproval: notificationsResult.data.length,
      }}
      displayName={currentUser.displayName}
      enquirySummary={{
        needsResponse:
          countStatus("new") + countStatus("waiting_for_reply"),
        openCount: openEnquiries.length,
        pipeline: [
          { label: "New", tone: "bg-sky-500", value: countStatus("new") },
          {
            label: "Waiting for reply",
            tone: "bg-amber-500",
            value: countStatus("waiting_for_reply"),
          },
          {
            label: "Offer sent",
            tone: "bg-violet-500",
            value: countStatus("offer_sent"),
          },
          {
            label: "Negotiating",
            tone: "bg-teal-600",
            value: countStatus("negotiating"),
          },
          {
            label: "Contract issued",
            tone: "bg-indigo-500",
            value: countStatus("contract_issued"),
          },
          {
            label: "Awaiting signatures",
            tone: "bg-orange-500",
            value: countStatus("awaiting_signatures"),
          },
        ],
      }}
      offerSummary={{
        awaitingApproval: offersResult.data.filter((offer) => offer.status === "draft").length,
        approvedNotSent: offersResult.data.filter((offer) => offer.status === "approved").length,
      }}
      bookingSummary={{
        activeCount: bookingsResult.data.length,
        yachtfolioPending: bookingsResult.data.filter((booking) => booking.yachtfolio?.status === "pending").length,
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
        openCount: tasksResult.data.length,
        overdueCount: tasksResult.data.filter((task) => taskDueState(task.due_date, task.status) === "overdue").length,
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
              context: `${task.booking.reference} · ${task.booking.yacht.name}`,
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
        missingRequired: requirementsResult.data.filter((requirement) => requirement.required && requirement.status === "missing").length,
        awaitingReview: requirementsResult.data.filter((requirement) => requirement.status === "uploaded").length,
        paymentsDue: paymentsResult.data.length,
      }}
      emailSummary={{
        reviewRequired: emailsResult.data.filter((message) => message.processing_status === "review_required").length,
        relevantReceived: emailsResult.data.filter((message) => message.classification !== "circular").length,
      }}
    />
  );
}
