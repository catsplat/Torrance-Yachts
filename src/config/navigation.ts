import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FolderLock,
  FileText,
  Mail,
  Inbox,
  LayoutDashboard,
  PlugZap,
  Settings,
  Ship,
  TicketsPlane,
} from "lucide-react";

export type ModuleKey =
  | "ai"
  | "enquiries"
  | "offers"
  | "bookings"
  | "tasks"
  | "yachts"
  | "contacts"
  | "documents"
  | "emails"
  | "calendar"
  | "integrations"
  | "settings";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export type NavigationGroup = {
  label?: string;
  items: NavigationItem[];
};

const dashboardNavigation: NavigationItem = {
  label: "Dashboard",
  href: "/",
  icon: LayoutDashboard,
  description: "Operational overview and actions requiring attention.",
};

export const navigationGroups: NavigationGroup[] = [
  {
    items: [dashboardNavigation],
  },
  {
    label: "Daily workflow",
    items: [
      {
        label: "Inbox",
        href: "/emails",
        icon: Mail,
        description: "Imported messages, deterministic routing, and human review.",
      },
      {
        label: "Enquiries",
        href: "/enquiries",
        icon: Inbox,
        description: "New enquiries, follow-ups, and linked email history.",
      },
      {
        label: "Offers",
        href: "/offers",
        icon: FileText,
        description: "Reviewable yacht proposals, approvals, and sent history.",
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: TicketsPlane,
        description: "Confirmed charters, availability, and booking progress.",
      },
      {
        label: "Operations",
        href: "/tasks",
        icon: ClipboardCheck,
        description: "Operational checklists, dependencies, and reminders.",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        description: "Charter dates, deadlines, and yacht availability.",
      },
    ],
  },
  {
    label: "Registers",
    items: [
      {
        label: "Yachts",
        href: "/yachts",
        icon: Ship,
        description: "Yacht profiles, contacts, documents, and commercial data.",
      },
      {
        label: "Contacts",
        href: "/contacts",
        icon: ContactRound,
        description: "Clients, brokers, captains, and company records.",
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FolderLock,
        description: "Private booking documents and approved sales material.",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "AI Review",
        href: "/ai/review",
        icon: BrainCircuit,
        description: "Evidence-backed suggestions awaiting human approval.",
      },
      {
        label: "Integrations",
        href: "/integrations",
        icon: PlugZap,
        description: "Notification approvals, provider delivery, and automation health.",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Users, alerts, templates, lifecycle rules, and launch controls.",
      },
    ],
  },
];

export const primaryNavigation = navigationGroups.flatMap((group) => group.items);

export const moduleNavigation = Object.fromEntries(
  primaryNavigation
    .filter((item) => item.href !== "/")
    .map((item) => [item.href.slice(1), item]),
) as Record<ModuleKey, NavigationItem>;
