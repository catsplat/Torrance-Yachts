import type { Enums } from "@/types/database"

export const enquiryStatusLabels: Record<Enums<"enquiry_status">, string> = {
  new: "New",
  waiting_for_reply: "Waiting for reply",
  offer_sent: "Offer sent",
  negotiating: "Negotiating",
  contract_issued: "Contract issued",
  awaiting_signatures: "Awaiting signatures",
  booked: "Booked",
  charter_active: "Charter active",
  completed: "Completed",
  archived: "Archived",
  cancelled: "Cancelled",
}

export const enquiryPriorityLabels: Record<Enums<"enquiry_priority">, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

export const enquiryNoteKindLabels: Record<Enums<"enquiry_note_kind">, string> = {
  internal: "Internal note",
  requirement: "Client requirement",
  follow_up: "Follow-up",
}

export const enquiryStatusTones: Record<Enums<"enquiry_status">, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-900",
  waiting_for_reply: "border-amber-200 bg-amber-50 text-amber-900",
  offer_sent: "border-violet-200 bg-violet-50 text-violet-900",
  negotiating: "border-teal-200 bg-teal-50 text-teal-900",
  contract_issued: "border-indigo-200 bg-indigo-50 text-indigo-900",
  awaiting_signatures: "border-orange-200 bg-orange-50 text-orange-900",
  booked: "border-emerald-200 bg-emerald-50 text-emerald-900",
  charter_active: "border-cyan-200 bg-cyan-50 text-cyan-900",
  completed: "border-slate-200 bg-slate-50 text-slate-800",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
  cancelled: "border-rose-200 bg-rose-50 text-rose-900",
}

export const enquiryPriorityTones: Record<Enums<"enquiry_priority">, string> = {
  low: "text-slate-600",
  normal: "text-slate-700",
  high: "text-amber-700",
  urgent: "text-rose-700",
}
