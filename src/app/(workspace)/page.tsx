import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { phaseFourOpenStatuses } from "@/lib/enquiries/state-machine";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const { data: openEnquiries, error } = await supabase
    .from("enquiries")
    .select("status")
    .in("status", phaseFourOpenStatuses);

  if (error) throw new Error("Unable to load the live enquiry dashboard summary.");

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
    />
  );
}
