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
  ListTodo,
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
  | "work"
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
    items: [dashboardNavigation, {
      label: "Work queue",
      href: "/work",
      icon: ListTodo,
      description: "Daily operational views in workflow order.",
    }],
  },
  {
    label: "Work",
    items: [
      {
        label: "Inbox",
        href: "/emails",
        icon: Mail,
        description: "Incoming email and follow-ups.",
      },
      {
        label: "Enquiries",
        href: "/enquiries",
        icon: Inbox,
        description: "Requests from first contact to offer.",
      },
      {
        label: "Offers",
        href: "/offers",
        icon: FileText,
        description: "Draft, approved, and sent offers.",
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: TicketsPlane,
        description: "Confirmed charters and booking progress.",
      },
      {
        label: "Tasks",
        href: "/tasks",
        icon: ClipboardCheck,
        description: "Checklists, due dates, and reminders.",
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        description: "Charter dates and deadlines.",
      },
      {
        label: "Yachts",
        href: "/yachts",
        icon: Ship,
        description: "Profiles, availability, and commercial data.",
      },
      {
        label: "Contacts",
        href: "/contacts",
        icon: ContactRound,
        description: "Clients, brokers, captains, and companies.",
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FolderLock,
        description: "Booking files and sales material.",
      },
    ],
  },
  {
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Account, workflow, and connections.",
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
