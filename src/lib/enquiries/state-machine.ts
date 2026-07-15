import type { Enums } from "@/types/database"

type EnquiryStatus = Enums<"enquiry_status">

export const enquiryTransitionTargets: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["waiting_for_reply", "offer_sent", "cancelled", "archived"],
  waiting_for_reply: ["new", "offer_sent", "cancelled", "archived"],
  offer_sent: [
    "waiting_for_reply",
    "negotiating",
    "contract_issued",
    "cancelled",
    "archived",
  ],
  negotiating: ["offer_sent", "contract_issued", "cancelled", "archived"],
  contract_issued: ["negotiating", "awaiting_signatures", "cancelled", "archived"],
  awaiting_signatures: ["negotiating", "contract_issued", "cancelled", "archived"],
  booked: ["charter_active", "cancelled"],
  charter_active: ["completed"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
}

export const phaseFourOpenStatuses: EnquiryStatus[] = [
  "new",
  "waiting_for_reply",
  "offer_sent",
  "negotiating",
  "contract_issued",
  "awaiting_signatures",
]

export function canTransitionEnquiry(
  currentStatus: EnquiryStatus,
  targetStatus: EnquiryStatus,
) {
  return enquiryTransitionTargets[currentStatus].includes(targetStatus)
}
