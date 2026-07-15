export const dashboardMetrics = [
  {
    key: "enquiries",
    label: "Open enquiries",
    value: "12",
    detail: "4 need a first response",
    trend: "+3 this week",
  },
  {
    key: "tasks",
    label: "Tasks due today",
    value: "7",
    detail: "2 are overdue",
    trend: "3 completed",
  },
  {
    key: "bookings",
    label: "Upcoming charters",
    value: "3",
    detail: "Next departure in 3 days",
    trend: "2 yachts",
  },
  {
    key: "documents",
    label: "Missing documents",
    value: "5",
    detail: "Across 2 bookings",
    trend: "1 awaiting review",
  },
] as const;

export const priorityTasks = [
  {
    id: "task-demo-001",
    title: "Review new BOJI enquiry",
    context: "Synthetic broker · 14–21 August",
    due: "09:30",
    status: "Waiting review",
    tone: "warning",
  },
  {
    id: "task-demo-002",
    title: "Confirm first instalment",
    context: "BOJI · Synthetic booking TY-026",
    due: "Today",
    status: "Payment due",
    tone: "danger",
  },
  {
    id: "task-demo-003",
    title: "Send captain contact details",
    context: "Synthetic booking TY-031",
    due: "14:00",
    status: "Ready",
    tone: "ready",
  },
  {
    id: "task-demo-004",
    title: "Verify signed charter agreement",
    context: "Synthetic booking TY-033",
    due: "Tomorrow",
    status: "Blocked by KYC",
    tone: "neutral",
  },
] as const;

export const enquiryPipeline = [
  { label: "New", value: 4, width: "33%", tone: "bg-sky-500" },
  { label: "Waiting for reply", value: 3, width: "25%", tone: "bg-amber-500" },
  { label: "Offer sent", value: 3, width: "25%", tone: "bg-violet-500" },
  { label: "Negotiating", value: 2, width: "17%", tone: "bg-teal-600" },
] as const;

export const upcomingSchedule = [
  {
    date: "18 Jul",
    yacht: "BOJI",
    event: "Charter starts",
    detail: "Synthetic booking · Athens",
  },
  {
    date: "25 Jul",
    yacht: "BOJI",
    event: "Charter ends",
    detail: "Follow-up scheduled for 27 Jul",
  },
  {
    date: "02 Aug",
    yacht: "Yacht 02",
    event: "Availability hold",
    detail: "Awaiting signed agreement",
  },
] as const;

export const recentActivity = [
  {
    action: "Enquiry created",
    actor: "Email intake preview",
    time: "8 minutes ago",
  },
  {
    action: "Task completed",
    actor: "KYC request marked sent",
    time: "34 minutes ago",
  },
  {
    action: "Document reviewed",
    actor: "Signed agreement · demo record",
    time: "1 hour ago",
  },
] as const;
