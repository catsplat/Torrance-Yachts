"use client"

import { useActionState } from "react"

import { amendBookingAction, transitionBookingAction, transitionYachtfolioAction, type BookingActionState } from "@/app/(workspace)/bookings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: BookingActionState = {}

export function BookingTransitionForm({ bookingId, target, label }: { bookingId: string; target: "charter_active" | "completed" | "cancelled"; label: string }) {
  const [state, action, pending] = useActionState(transitionBookingAction.bind(null, bookingId), initialState)
  return <form action={action} className="space-y-3 rounded-xl border p-4"><input name="new_status" type="hidden" value={target} /><label className="space-y-1.5 text-xs font-medium">Reason<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={1000} name="reason" required /></label><p className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button className="w-full" disabled={pending} type="submit" variant={target === "cancelled" ? "destructive" : "default"}>{pending ? "Recording…" : label}</Button></form>
}

export function YachtfolioActionForm({ actionId, bookingId, status }: { actionId: string; bookingId: string; status: "pending" | "completed" }) {
  const [state, action, pending] = useActionState(transitionYachtfolioAction.bind(null, actionId, bookingId), initialState)
  const target = status === "pending" ? "completed" : "pending"
  return <form action={action} className="space-y-3"><input name="new_status" type="hidden" value={target} /><label className="space-y-1.5 text-xs font-medium">{target === "completed" ? "Completion evidence" : "Reason for reopening"}<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={2000} name="reason" required /></label><p className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit" variant={target === "pending" ? "outline" : "default"}>{pending ? "Recording…" : target === "completed" ? "Record Yachtfolio work complete" : "Reopen Yachtfolio action"}</Button></form>
}

type AmendValues = { yachtId: string; startDate: string; endDate: string; embarkationPort: string | null; disembarkationPort: string | null; guestCount: number | null; charterFee: number; currency: string; taxRate: number }
export function BookingAmendmentForm({ bookingId, yachts, values }: { bookingId: string; yachts: { id: string; name: string }[]; values: AmendValues }) {
  const [state, action, pending] = useActionState(amendBookingAction.bind(null, bookingId), initialState)
  return <form action={action} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Yacht<select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue={values.yachtId} name="yacht_id">{yachts.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select></label><Field label="Start"><Input defaultValue={values.startDate} name="charter_start_date" required type="date" /></Field><Field label="End"><Input defaultValue={values.endDate} name="charter_end_date" required type="date" /></Field><Field label="Guests"><Input defaultValue={values.guestCount ?? ""} max={36} min={1} name="guest_count" type="number" /></Field><Field label="Embarkation"><Input defaultValue={values.embarkationPort ?? ""} name="embarkation_port" /></Field><Field label="Disembarkation"><Input defaultValue={values.disembarkationPort ?? ""} name="disembarkation_port" /></Field><Field label="Charter fee"><Input defaultValue={values.charterFee} min="0.01" name="charter_fee" required step="0.01" type="number" /></Field><Field label="Currency"><Input defaultValue={values.currency} name="currency" required /></Field><Field label="Tax rate"><Input defaultValue={values.taxRate} min={0} max={100} name="tax_rate" required step="0.01" type="number" /></Field><label className="space-y-1 text-xs font-medium sm:col-span-2">Amendment reason<textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={1000} name="reason" required /></label><div className="flex items-center justify-between gap-3 sm:col-span-2"><p className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Rechecking…" : "Save reviewed amendment"}</Button></div></form>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1 text-xs font-medium">{label}{children}</label> }
