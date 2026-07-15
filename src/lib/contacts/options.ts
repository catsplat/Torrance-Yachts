import type { Enums } from "@/types/database"

export const contactRoleLabels: Record<Enums<"contact_role">, string> = {
  broker: "Broker",
  captain: "Captain",
  charterer: "Charterer",
  crew: "Crew",
  customer: "Customer",
  operations: "Operations",
  other: "Other",
  supplier: "Supplier",
}

export const yachtResponsibilityLabels: Record<
  Enums<"yacht_contact_responsibility">,
  string
> = {
  captain: "Captain",
  crew: "Crew",
  manager: "Manager",
  notification_recipient: "Notification recipient",
  operations: "Operations",
  other: "Other",
}
