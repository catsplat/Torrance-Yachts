import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
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

  return (
    <AppShell
      currentUser={currentUser}
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
