"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationGroups } from "@/config/navigation";
import { cn } from "@/lib/utils";

type PrimaryNavigationProps = {
  onNavigate?: () => void;
};

export function PrimaryNavigation({ onNavigate }: PrimaryNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-6">
      {navigationGroups.map((group, groupIndex) => (
        <div key={group.label ?? `navigation-${groupIndex}`} className="space-y-1">
          {group.label ? (
            <p className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tutorial-anchor={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1).replaceAll("/", "-")}`}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "group flex min-h-9 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive
                    ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/10"
                    : "text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4.5",
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
