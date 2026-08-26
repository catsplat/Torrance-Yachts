"use client"

import { useActionState } from "react"

import { confirmBookingAction, createAvailabilityBlockAction, createManualBookingAction, type BookingActionState } from "@/app/(workspace)/bookings/actions"
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

type Option = { id: string; name: string }

export function ManualCalendarEntryForm({
  companies,
  contacts,
  yachts,
}: {
  companies: Option[]
  contacts: Option[]
  yachts: Option[]
}) {
  const [bookingState, bookingAction, bookingPending] = useActionState(createManualBookingAction, initialState)
  const [blockState, blockAction, blockPending] = useActionState(createAvailabilityBlockAction, initialState)
  return <div className="grid gap-5 lg:grid-cols-2">
    <form action={bookingAction} className="space-y-4 rounded-xl border p-5">
      <div><h2 className="font-semibold">Confirmed charter</h2><p className="mt-1 text-sm text-muted-foreground">Use after the signed agreement has been reviewed. This reserves dates and starts the booking checklist.</p></div>
      <ManualCoreFields yachts={yachts} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer"><Select name="customer_contact_id" options={contacts} placeholder="Not recorded" /></Field>
        <Field label="Broker"><Select name="broker_contact_id" options={contacts} placeholder="Not recorded" /></Field>
        <Field label="Broker company"><Select name="broker_company_id" options={companies} placeholder="Not recorded" /></Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950"><input className="mt-1 size-4" name="signed_agreement_confirmed" required type="checkbox" />I have reviewed the charter agreement and confirm it is signed by every required party.</label>
      <Field error={bookingState.fieldErrors?.confirmation_reason?.[0]} label="Confirmation record"><textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={1000} name="confirmation_reason" placeholder="What was reviewed?" required /></Field>
      <p aria-live="polite" className={bookingState.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{bookingState.message}</p>
      <Button disabled={bookingPending} type="submit">{bookingPending ? "Creating…" : "Create confirmed charter"}</Button>
    </form>
    <form action={blockAction} className="space-y-4 rounded-xl border p-5">
      <div><h2 className="font-semibold">Availability block</h2><p className="mt-1 text-sm text-muted-foreground">Use for dates that must be unavailable but are not a confirmed charter. No booking tasks or payments are created.</p></div>
      <Field error={blockState.fieldErrors?.title?.[0]} label="Title"><Input maxLength={240} name="title" placeholder="Owner use" required /></Field>
      <Field error={blockState.fieldErrors?.yacht_id?.[0]} label="Yacht"><Select name="yacht_id" options={yachts} placeholder="Select yacht" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field error={blockState.fieldErrors?.charter_start_date?.[0]} label="Start"><Input name="charter_start_date" required type="date" /></Field><Field error={blockState.fieldErrors?.charter_end_date?.[0]} label="End"><Input name="charter_end_date" required type="date" /></Field></div>
      <Field label="Internal note"><textarea className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={5000} name="notes" /></Field>
      <p className="text-xs text-muted-foreground">The one-day operational buffer is applied automatically.</p>
      <p aria-live="polite" className={blockState.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{blockState.message}</p>
      <Button disabled={blockPending} type="submit" variant="outline">{blockPending ? "Creating…" : "Create availability block"}</Button>
    </form>
  </div>
}

function ManualCoreFields({ yachts }: { yachts: Option[] }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Field label="Yacht"><Select name="yacht_id" options={yachts} placeholder="Select yacht" required /></Field><Field label="Guests"><Input max={36} min={1} name="guest_count" type="number" /></Field><Field label="Charter start"><Input name="charter_start_date" required type="date" /></Field><Field label="Charter end"><Input name="charter_end_date" required type="date" /></Field><Field label="Embarkation port"><Input maxLength={120} name="embarkation_port" /></Field><Field label="Disembarkation port"><Input maxLength={120} name="disembarkation_port" /></Field><Field label="Reviewed charter fee"><Input min="0.01" name="charter_fee" required step="0.01" type="number" /></Field><Field label="Currency"><Input defaultValue="EUR" maxLength={3} name="currency" required /></Field><Field label="Tax rate (%)"><Input defaultValue="0" max={100} min={0} name="tax_rate" required step="0.01" type="number" /></Field></div>
}

function Select({ name, options, placeholder, required }: { name: string; options: Option[]; placeholder: string; required?: boolean }) { return <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" defaultValue="" name={name} required={required}><option disabled={required} value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select> }

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="space-y-1.5 text-xs font-medium">{label}{children}{error ? <span className="block text-destructive">{error}</span> : null}</label> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div> }
