import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FolderLock,
  FileText,
  Mail,
  Inbox,
  LayoutDashboard,
  Settings,
  Ship,
  TicketsPlane,
} from "lucide-react";

export type ModuleKey =
  | "enquiries"
  | "offers"
  | "bookings"
  | "tasks"
  | "yachts"
  | "contacts"
  | "documents"
  | "emails"
  | "calendar"
  | "settings";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Operational overview and actions requiring attention.",
  },
  {
    label: "Enquiries",
    href: "/enquiries",
    icon: Inbox,
    description: "New enquiries, follow-ups, offers, and email history.",
  },
  {
    label: "Email Inbox",
    href: "/emails",
    icon: Mail,
    description: "Imported messages, deterministic routing, and human review.",
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
    label: "Tasks",
    href: "/tasks",
    icon: ClipboardCheck,
    description: "Operational checklists, dependencies, and reminders.",
  },
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
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    description: "Charter dates, deadlines, and yacht availability.",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Users, templates, integrations, and audit configuration.",
  },
];

export const moduleNavigation = Object.fromEntries(
  primaryNavigation
    .filter((item) => item.href !== "/")
    .map((item) => [item.href.slice(1), item]),
) as Record<ModuleKey, NavigationItem>;
