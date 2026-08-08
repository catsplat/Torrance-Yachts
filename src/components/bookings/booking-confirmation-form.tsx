"use client"

import { useActionState } from "react"

import { confirmBookingAction, type BookingActionState } from "@/app/(workspace)/bookings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: BookingActionState = {}

export type BookingConfirmationValues = {
  enquiryId: string; offerId: string; yachtId: string; yachtName: string
  startDate: string; endDate: string; embarkationPort: string | null
  disembarkationPort: string | null; guestCount: number | null
  charterFee: number; currency: string; taxRate: number
}

export function BookingConfirmationForm({ values }: { values: BookingConfirmationValues }) {
  const [state, action, pending] = useActionState(confirmBookingAction, initialState)
  return <form action={action} className="space-y-5">
    <input name="enquiry_id" type="hidden" value={values.enquiryId} />
    <input name="source_offer_id" type="hidden" value={values.offerId} />
    <input name="yacht_id" type="hidden" value={values.yachtId} />
    <div className="grid gap-4 sm:grid-cols-2">
      <ReadOnly label="Yacht" value={values.yachtName} />
      <ReadOnly label="Source offer" value="Sent and locked" />
      <Field error={state.fieldErrors?.charter_start_date?.[0]} label="Charter start"><Input defaultValue={values.startDate} name="charter_start_date" required type="date" /></Field>
      <Field error={state.fieldErrors?.charter_end_date?.[0]} label="Charter end"><Input defaultValue={values.endDate} name="charter_end_date" required type="date" /></Field>
      <Field label="Embarkation port"><Input defaultValue={values.embarkationPort ?? ""} maxLength={120} name="embarkation_port" /></Field>
      <Field label="Disembarkation port"><Input defaultValue={values.disembarkationPort ?? ""} maxLength={120} name="disembarkation_port" /></Field>
      <Field label="Guests"><Input defaultValue={values.guestCount ?? ""} max={36} min={1} name="guest_count" type="number" /></Field>
      <Field error={state.fieldErrors?.charter_fee?.[0]} label="Reviewed charter fee"><Input defaultValue={values.charterFee} min="0.01" name="charter_fee" required step="0.01" type="number" /></Field>
      <Field label="Currency"><Input defaultValue={values.currency} maxLength={3} name="currency" required /></Field>
      <Field label="Tax rate (%)"><Input defaultValue={values.taxRate} max={100} min={0} name="tax_rate" required step="0.01" type="number" /></Field>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <label className="flex items-start gap-3 text-sm font-medium"><input className="mt-1 size-4" name="signed_agreement_confirmed" required type="checkbox" />I have reviewed the charter agreement and confirm it is signed by every required party.</label>
      <p className="mt-2 pl-7 text-xs leading-5">This reserves the yacht dates and starts the booking checklist.</p>
    </div>
    <Field error={state.fieldErrors?.confirmation_reason?.[0]} label="Confirmation record"><textarea className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={1000} name="confirmation_reason" placeholder="Record what signed agreement and details you reviewed" required /></Field>
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>
    <Button className="w-full sm:w-auto" disabled={pending} type="submit">{pending ? "Confirming…" : "Confirm booking"}</Button>
  </form>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="space-y-1.5 text-xs font-medium">{label}{children}{error ? <span className="block text-destructive">{error}</span> : null}</label> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div> }
