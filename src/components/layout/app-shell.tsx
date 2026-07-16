import { Bell, LockKeyhole, LogOut, Search, ShieldCheck, ShipWheel } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { TutorialSpotlight } from "@/components/tutorial/tutorial-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  children: React.ReactNode;
  currentUser: {
    displayName: string;
    role: "administrator" | "staff";
  };
  environmentLabel: string;
};

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TY";
}

export function AppShell({ children, currentUser, environmentLabel }: AppShellProps) {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <ShipWheel aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Torrance Yachts</p>
            <p className="text-xs text-sidebar-foreground/55">
              Charter operations
            </p>
          </div>
        </div>

        <Separator className="my-5 bg-sidebar-border" />
        <div className="flex-1 overflow-y-auto">
          <PrimaryNavigation />
        </div>

        <div className="mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldCheck aria-hidden="true" className="size-4 text-sidebar-primary" />
            Private workspace
          </div>
          <p className="mt-1.5 text-xs leading-5 text-sidebar-foreground/55">
            Authenticated {environmentLabel.toLowerCase()} workspace.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <MobileNavigation />

          <div className="relative hidden w-full max-w-md md:block">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search the workspace"
              placeholder="Search enquiries, bookings, yachts..."
              className="h-9 bg-card pl-9"
              readOnly
              title="Search will be connected when the database is added"
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <Badge
              variant="outline"
              className="hidden border-teal-700/20 bg-teal-50 text-teal-800 sm:inline-flex"
            >
              {environmentLabel}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications preview"
              title="Notifications will be enabled in a later slice"
              className="relative"
            >
              <Bell aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rose-500" />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-7" />
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(currentUser.displayName)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-medium">
                  {currentUser.displayName}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LockKeyhole aria-hidden="true" className="size-3" />
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

        <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <TutorialSpotlight />
    </div>
  );
}
