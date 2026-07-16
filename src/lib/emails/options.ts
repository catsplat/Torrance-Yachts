import type { Enums } from "@/types/database"

export const emailClassificationLabels: Record<Enums<"email_classification">, string> = {
  unclassified: "Needs review",
  new_enquiry: "New enquiry",
  enquiry_follow_up: "Enquiry follow-up",
  internal: "Internal",
  circular: "Circular / newsletter",
  other_relevant: "Other relevant",
}
export const emailProcessingLabels: Record<Enums<"email_processing_status">, string> = {
  received: "Received",
  review_required: "Review required",
  classified: "Classified",
  linked: "Linked",
  ignored: "Ignored",
}
