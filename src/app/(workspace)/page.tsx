import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { phaseFourOpenStatuses } from "@/lib/enquiries/state-machine";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const [enquiriesResult, offersResult, bookingsResult] = await Promise.all([
    supabase.from("enquiries").select("status").in("status", phaseFourOpenStatuses),
    supabase.from("offers").select("status").in("status", ["draft", "approved"]),
    supabase.from("bookings").select("id,reference,status,charter_start_date,charter_end_date,yacht:yachts!bookings_yacht_id_fkey(name),yachtfolio:yachtfolio_booking_actions!yachtfolio_booking_actions_booking_id_fkey(status)").in("status", ["confirmed", "charter_active"]).order("charter_start_date").limit(5),
  ]);
  const { data: openEnquiries, error } = enquiriesResult;

  if (error || offersResult.error || bookingsResult.error) throw new Error("Unable to load the live dashboard summary.");

  const countStatus = (status: (typeof phaseFourOpenStatuses)[number]) =>
    openEnquiries.filter((enquiry) => enquiry.status === status).length;

  return (
    <DashboardOverview
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
    />
  );
}
