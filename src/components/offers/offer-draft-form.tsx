"use client"

import { useActionState } from "react"

import {
  createOfferDraftAction,
  updateOfferDraftAction,
  type OfferActionState,
} from "@/app/(workspace)/offers/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: OfferActionState = {}

export type OfferDraftFormValues = {
  enquiryId: string
  templateVersionId: string
  ratePeriodId: string
  sourceOfferId?: string | null
  recipientName: string
  subject: string
  body: string
  proposedCharterFee: number
  currency: string
}

export function OfferDraftForm({
  values,
  offerId,
}: {
  values: OfferDraftFormValues
  offerId?: string
}) {
  const actionFunction = offerId ? updateOfferDraftAction.bind(null, offerId) : createOfferDraftAction
  const [state, action, pending] = useActionState(actionFunction, initialState)

  return <form action={action} className="space-y-4">
    <input name="enquiry_id" type="hidden" value={values.enquiryId} />
    <input name="template_version_id" type="hidden" value={values.templateVersionId} />
    <input name="rate_period_id" type="hidden" value={values.ratePeriodId} />
    <input name="source_offer_id" type="hidden" value={values.sourceOfferId ?? ""} />
    <Field label="Recipient name" error={state.fieldErrors?.recipient_name?.[0]}><Input defaultValue={values.recipientName} name="recipient_name" required /></Field>
    <Field label="Subject" error={state.fieldErrors?.subject_snapshot?.[0]}><Input defaultValue={values.subject} maxLength={300} name="subject_snapshot" required /></Field>
    <Field label="Proposed charter fee" error={state.fieldErrors?.proposed_charter_fee?.[0]}><div className="flex max-w-sm items-center gap-2"><Input defaultValue={values.proposedCharterFee} min="0.01" name="proposed_charter_fee" step="0.01" type="number" required /><span className="text-sm text-muted-foreground">{values.currency}</span></div></Field>
    <Field label="Plain-text offer draft" error={state.fieldErrors?.body_snapshot?.[0]}><textarea className="min-h-[30rem] w-full rounded-lg border border-input bg-background px-3 py-3 font-mono text-sm leading-6" defaultValue={values.body} maxLength={30000} name="body_snapshot" required /></Field>
    <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Saving…" : offerId ? "Save draft" : "Create reviewable draft"}</Button></div>
  </form>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium">{label}</label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>
}
