import type { Enums } from "@/types/database"

export const bookingStatusLabels: Record<Enums<"booking_status">, string> = {
  confirmed: "Confirmed",
  charter_active: "Charter active",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const bookingStatusValues = ["confirmed", "charter_active", "completed", "cancelled"] as const

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export function formatBookingMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(value)
}
