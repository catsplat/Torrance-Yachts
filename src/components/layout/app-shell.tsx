import { Bell, LogOut, ShipWheel } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WorkspaceSearch } from "@/components/layout/workspace-search";
import { TutorialSpotlight } from "@/components/tutorial/tutorial-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  children: React.ReactNode;
  currentUser: {
    displayName: string;
    role: "administrator" | "staff";
  };
  environmentLabel: string;
  initialTheme: "dark" | "light";
  unreadNotificationCount: number;
};

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TY";
}

export function AppShell({
  children,
  currentUser,
  environmentLabel,
  initialTheme,
  unreadNotificationCount,
}: AppShellProps) {
  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-black/10">
            <ShipWheel aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Torrance Yachts</p>
            <p className="text-xs text-sidebar-foreground/55">
              Charter operations
            </p>
          </div>
        </div>

        <Separator className="my-6 bg-sidebar-border" />
        <div className="flex-1 overflow-y-auto">
          <PrimaryNavigation />
        </div>

      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur md:px-6 lg:px-8">
          <MobileNavigation />

          <WorkspaceSearch />

          <div className="ml-auto flex items-center gap-2.5">
            {environmentLabel !== "Production" ? (
              <Badge
                variant="outline"
                className="hidden border-teal-700/20 bg-teal-50 text-teal-800 sm:inline-flex dark:border-teal-300/20 dark:bg-teal-950/45 dark:text-teal-200"
              >
                {environmentLabel}
              </Badge>
            ) : null}
            <ThemeToggle initialTheme={initialTheme} />
            <Link
              aria-label={`${unreadNotificationCount} unread notifications`}
              className="relative inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/notifications"
              title="Open notifications"
            >
              <Bell aria-hidden="true" className="size-4" />
              {unreadNotificationCount ? (
                <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-semibold leading-4 text-white">
                  {Math.min(unreadNotificationCount, 99)}
                </span>
              ) : null}
            </Link>
            <Separator orientation="vertical" className="mx-1 h-7" />
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(currentUser.displayName)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-medium">
                  {currentUser.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser.role === "administrator" ? "Administrator" : "Staff"}
                </p>
              </div>
              <form action={signOutAction}>
                <Button
                  aria-label="Sign out"
                  size="icon"
                  title="Sign out"
                  type="submit"
                  variant="ghost"
                >
                  <LogOut aria-hidden="true" />
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8" id="main-content" tabIndex={-1}>{children}</main>
      </div>
      <TutorialSpotlight />
    </div>
  );
}
