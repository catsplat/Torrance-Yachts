import type { Enums } from "@/types/database"

export const taskStatusLabels: Record<Enums<"task_status">, string> = {
  blocked: "Blocked",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const taskPriorityLabels: Record<Enums<"task_priority">, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

export const taskDueAnchorLabels: Record<Enums<"task_due_anchor">, string> = {
  none: "No automatic date",
  booking_confirmed: "Booking confirmed",
  charter_start: "Charter start",
  charter_end: "Charter end",
  contract_payment_1: "Contract payment 1",
  contract_payment_2: "Contract payment 2",
  contract_payment_3: "Contract payment 3",
}

export const taskStatusValues = ["blocked", "ready", "completed", "cancelled"] as const
export const taskPriorityValues = ["low", "normal", "high", "urgent"] as const
export const taskDueAnchorValues = [
  "none",
  "booking_confirmed",
  "charter_start",
  "charter_end",
  "contract_payment_1",
  "contract_payment_2",
  "contract_payment_3",
] as const

export function formatTaskDate(value: string | null) {
  if (!value) return "No date"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

export function taskDueState(dueDate: string | null, status: Enums<"task_status">) {
  if (!dueDate || !["blocked", "ready"].includes(status)) return "none"
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const dueUtc = Date.parse(`${dueDate}T00:00:00Z`)
  if (dueUtc < todayUtc) return "overdue"
  if (dueUtc === todayUtc) return "today"
  return "future"
}
