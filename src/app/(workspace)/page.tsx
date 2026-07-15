import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <DashboardOverview displayName={currentUser.displayName} />;
}
