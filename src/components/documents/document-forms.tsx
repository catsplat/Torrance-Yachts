"use client"

import { useActionState } from "react"

import {
  approveContractReviewAction,
  type DocumentActionState,
  markPaymentPaidAction,
  reviewBookingDocumentAction,
  saveContractReviewAction,
  uploadBookingDocumentAction,
  waiveRequirementAction,
} from "@/app/(workspace)/documents/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ContractAiSuggestion } from "@/lib/ai/schemas"
import {
  documentTypeLabels,
  retentionClassLabels,
} from "@/lib/documents/options"
import type { Tables } from "@/types/database"

const initialState: DocumentActionState = {}

function Feedback({ state }: { state: DocumentActionState }) {
  if (!state.message) return null
  return (
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
      {state.message}
    </p>
  )
}

export function DocumentUploadForm({
  bookingId,
  suggestedType = "other",
}: {
  bookingId: string
  suggestedType?: Tables<"documents">["document_type"]
}) {
  const [state, action, pending] = useActionState(uploadBookingDocumentAction, initialState)
  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2" encType="multipart/form-data">
      <input name="bookingId" type="hidden" value={bookingId} />
      <label className="grid gap-1 text-sm">Document title<Input name="title" required /></label>
      <label className="grid gap-1 text-sm">Document type
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={suggestedType} name="documentType">
          {Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Retention class
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={suggestedType === "client_passport" || suggestedType === "cdd_check" ? "identity_sensitive" : "booking_record"} name="retentionClass">
          {Object.entries(retentionClassLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Private file<Input accept=".pdf,.jpg,.jpeg,.png" name="file" required type="file" /></label>
      <div className="flex items-end"><Button disabled={pending} type="submit">{pending ? "Uploading…" : "Upload privately"}</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function DocumentReviewForm({ bookingId, documentId }: { bookingId: string; documentId: string }) {
  const action = reviewBookingDocumentAction.bind(null, bookingId)
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="grid gap-2">
      <input name="documentId" type="hidden" value={documentId} />
      <Input name="reason" placeholder="Review evidence or rejection reason" required />
      <div className="flex gap-2">
        <Button disabled={pending} name="approved" type="submit" value="true">Verify</Button>
        <Button disabled={pending} name="approved" type="submit" value="false" variant="outline">Reject</Button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

export function RequirementWaiverForm({ bookingId, requirementId }: { bookingId: string; requirementId: string }) {
  const action = waiveRequirementAction.bind(null, bookingId)
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      <input name="requirementId" type="hidden" value={requirementId} />
      <Input className="min-w-64 flex-1" name="reason" placeholder="Why this optional document is not applicable" required />
      <Button disabled={pending} type="submit" variant="outline">Waive</Button>
      <Feedback state={state} />
    </form>
  )
}

export function ContractReviewForm({
  booking,
  reviewedSuggestion,
  sourceDocumentId,
}: {
  booking: Pick<Tables<"bookings">, "id" | "charter_start_date" | "charter_end_date" | "charter_fee" | "currency" | "tax_rate" | "embarkation_port" | "disembarkation_port">
  reviewedSuggestion?: ContractAiSuggestion | null
  sourceDocumentId: string
}) {
  const extracted = reviewedSuggestion?.extracted
  const [state, action, pending] = useActionState(saveContractReviewAction, initialState)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input name="bookingId" type="hidden" value={booking.id} />
      <input name="sourceDocumentId" type="hidden" value={sourceDocumentId} />
      <label className="grid gap-1 text-sm">Charter start<Input defaultValue={extracted?.charter_start_date ?? booking.charter_start_date} name="charterStartDate" required type="date" /></label>
      <label className="grid gap-1 text-sm">Charter end<Input defaultValue={extracted?.charter_end_date ?? booking.charter_end_date} name="charterEndDate" required type="date" /></label>
      <label className="grid gap-1 text-sm">Embarkation port<Input defaultValue={extracted?.embarkation_port ?? booking.embarkation_port ?? ""} name="embarkationPort" /></label>
      <label className="grid gap-1 text-sm">Disembarkation port<Input defaultValue={extracted?.disembarkation_port ?? booking.disembarkation_port ?? ""} name="disembarkationPort" /></label>
      <label className="grid gap-1 text-sm">Charter fee<Input defaultValue={extracted?.charter_fee ?? booking.charter_fee} min="0.01" name="charterFee" required step="0.01" type="number" /></label>
      <label className="grid gap-1 text-sm">Currency<Input defaultValue={extracted?.currency ?? booking.currency} maxLength={3} name="currency" required /></label>
      <label className="grid gap-1 text-sm">Tax rate %<Input defaultValue={extracted?.tax_rate ?? booking.tax_rate} min="0" name="taxRate" required step="0.01" type="number" /></label>
      <label className="grid gap-1 text-sm">Commission rate %<Input defaultValue={extracted?.commission_rate ?? 2} min="0" name="commissionRate" required step="0.01" type="number" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Review notes<textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" name="reviewNotes" required /></label>
      <div><Button disabled={pending} type="submit">Save reviewed fields</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function ContractApprovalForm({
  bookingId,
  reviewId,
  suggestedInstalments = [],
}: {
  bookingId: string
  reviewId: string
  suggestedInstalments?: ContractAiSuggestion["extracted"]["instalments"]
}) {
  const action = approveContractReviewAction.bind(null, bookingId)
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input name="reviewId" type="hidden" value={reviewId} />
      {[1, 2, 3].map((number) => (
        <div className="contents" key={number}>
          <label className="grid gap-1 text-sm">Instalment {number} date<Input defaultValue={suggestedInstalments[number - 1]?.due_date ?? ""} name={`payment${number}Date`} required={number === 1} type="date" /></label>
          <label className="grid gap-1 text-sm">Instalment {number} amount<Input defaultValue={suggestedInstalments[number - 1]?.amount ?? ""} min="0.01" name={`payment${number}Amount`} required={number === 1} step="0.01" type="number" /></label>
        </div>
      ))}
      <div className="md:col-span-2"><Button disabled={pending} type="submit">Approve contract and schedule</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function PaymentPaidForm({ bookingId, paymentId }: { bookingId: string; paymentId: string }) {
  const action = markPaymentPaidAction.bind(null, bookingId)
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="grid gap-2">
      <input name="paymentId" type="hidden" value={paymentId} />
      <Input name="reason" placeholder="Payment evidence reviewed" required />
      <Button disabled={pending} type="submit" variant="outline">Record paid</Button>
      <Feedback state={state} />
    </form>
  )
}
