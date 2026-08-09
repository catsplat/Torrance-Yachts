import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requiresMfa } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }
  if (requiresMfa(currentUser)) redirect("/account/mfa");
  const [themeCookie, supabase] = await Promise.all([cookies(), createClient()]);
  const { count: unreadNotificationCount, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", currentUser.id)
    .is("read_at", null);
  if (error) throw new Error("Unable to load the notification summary.");

  return (
    <AppShell
      currentUser={currentUser}
      initialTheme={themeCookie.get("ty-theme")?.value === "dark" ? "dark" : "light"}
      unreadNotificationCount={unreadNotificationCount ?? 0}
      environmentLabel={
        process.env.APP_ENVIRONMENT === "production"
          ? "Production"
          : process.env.APP_ENVIRONMENT === "staging"
            ? "Staging"
            : "Local development"
      }
    >
      {children}
    </AppShell>
  );
}
