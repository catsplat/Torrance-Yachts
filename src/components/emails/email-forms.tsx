"use client"

import { useActionState } from "react"

import {
  classifyEmailAction,
  type EmailActionState,
  runEnquiryTimeoutSweepAction,
  updateOperationalSettingsAction,
} from "@/app/(workspace)/emails/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EmailAiSuggestion } from "@/lib/ai/schemas"
import { emailClassificationLabels } from "@/lib/emails/options"
import type { Tables } from "@/types/database"

const initialState: EmailActionState = {}

function Feedback({ state }: { state: EmailActionState }) {
  if (!state.message) return null
  return <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>
}

export function EmailClassificationForm({
  contacts,
  enquiries,
  message,
  reviewedSuggestion,
  yachts,
}: {
  contacts: Array<Pick<Tables<"contacts">, "id" | "full_name" | "email" | "roles">>
  enquiries: Array<Pick<Tables<"enquiries">, "id" | "reference" | "summary" | "status">>
  message: Pick<Tables<"email_messages">, "id" | "classification" | "subject" | "snippet">
  reviewedSuggestion?: EmailAiSuggestion | null
  yachts: Array<Pick<Tables<"yachts">, "id" | "name">>
}) {
  const [state, action, pending] = useActionState(classifyEmailAction, initialState)
  const suggestedYachtId = yachts.find((yacht) =>
    yacht.name.toLocaleLowerCase() ===
      reviewedSuggestion?.extracted.requested_yacht_name?.toLocaleLowerCase()
  )?.id ?? ""
  const defaultClassification =
    reviewedSuggestion?.classification && reviewedSuggestion.classification !== "unclassified"
      ? reviewedSuggestion.classification
      : message.classification === "unclassified"
        ? "new_enquiry"
        : message.classification

  return (
    <form action={action} className="grid gap-4">
      <input name="messageId" type="hidden" value={message.id} />
      <label className="grid gap-1 text-sm">Classification
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={defaultClassification} name="classification">
          {Object.entries(emailClassificationLabels).filter(([value]) => value !== "unclassified").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Requester for a new enquiry
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="" name="contactId">
          <option value="">Create or reuse the sender contact</option>
          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name}{contact.email ? ` · ${contact.email}` : ""}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">New-enquiry summary
        <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={reviewedSuggestion?.summary ?? `${message.subject}${message.snippet ? ` — ${message.snippet}` : ""}`} name="enquirySummary" />
      </label>
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
        <p className="text-sm font-medium md:col-span-2">Reviewed new-enquiry details</p>
        <label className="grid gap-1 text-sm">Requested yacht
          <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={suggestedYachtId} name="requestedYachtId">
            <option value="">Not identified</option>
            {yachts.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Guests<Input defaultValue={reviewedSuggestion?.extracted.guest_count ?? ""} max="36" min="1" name="guestCount" type="number" /></label>
        <label className="grid gap-1 text-sm">Charter start<Input defaultValue={reviewedSuggestion?.extracted.charter_start_date ?? ""} name="charterStartDate" type="date" /></label>
        <label className="grid gap-1 text-sm">Charter end<Input defaultValue={reviewedSuggestion?.extracted.charter_end_date ?? ""} name="charterEndDate" type="date" /></label>
        <label className="grid gap-1 text-sm">Embarkation port<Input defaultValue={reviewedSuggestion?.extracted.embarkation_port ?? ""} name="embarkationPort" /></label>
        <label className="grid gap-1 text-sm">Disembarkation port<Input defaultValue={reviewedSuggestion?.extracted.disembarkation_port ?? ""} name="disembarkationPort" /></label>
        <label className="grid gap-1 text-sm">Budget<Input defaultValue={reviewedSuggestion?.extracted.budget_amount ?? ""} min="0" name="budgetAmount" step="0.01" type="number" /></label>
        <label className="grid gap-1 text-sm">Currency<Input defaultValue={reviewedSuggestion?.extracted.currency ?? ""} maxLength={3} name="currency" /></label>
      </div>
      <label className="grid gap-1 text-sm">Existing enquiry for a follow-up
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="" name="enquiryId">
          <option value="">Not linking as a follow-up</option>
          {enquiries.map((enquiry) => <option key={enquiry.id} value={enquiry.id}>{enquiry.reference} · {enquiry.summary}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Review reason
        <Input name="reason" placeholder="What you checked and why this category is correct" required />
      </label>
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Apply reviewed classification"}</Button>
      <Feedback state={state} />
    </form>
  )
}

export function OperationalSettingsForm({ settings }: { settings: Tables<"operational_settings"> }) {
  const [state, action, pending] = useActionState(updateOperationalSettingsAction, initialState)
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="flex items-center gap-3 text-sm md:col-span-2"><input defaultChecked={settings.enquiry_timeout_enabled} name="enquiryTimeoutEnabled" type="checkbox" />Automatically archive inactive pre-contract enquiries</label>
      <label className="grid gap-1 text-sm">New enquiry timeout (days)<Input defaultValue={settings.new_enquiry_timeout_days} max="365" min="1" name="newEnquiryTimeoutDays" required type="number" /></label>
      <label className="grid gap-1 text-sm">Waiting-for-reply timeout (days)<Input defaultValue={settings.waiting_reply_timeout_days} max="365" min="1" name="waitingReplyTimeoutDays" required type="number" /></label>
      <label className="grid gap-1 text-sm">Offer-sent timeout (days)<Input defaultValue={settings.offer_sent_timeout_days} max="365" min="1" name="offerSentTimeoutDays" required type="number" /></label>
      <label className="grid gap-1 text-sm">Negotiating timeout (days)<Input defaultValue={settings.negotiating_timeout_days} max="365" min="1" name="negotiatingTimeoutDays" required type="number" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Internal email domains
        <Input defaultValue={settings.internal_email_domains.join(", ")} name="internalEmailDomains" placeholder="company.example, operations.example" />
        <span className="text-xs text-muted-foreground">Comma-separated. Messages from these domains route as internal without AI.</span>
      </label>
      <div className="md:col-span-2"><Button disabled={pending} type="submit">Save operational settings</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function TimeoutSweepForm() {
  const [state, action, pending] = useActionState(runEnquiryTimeoutSweepAction, initialState)
  return (
    <form action={action} className="space-y-3">
      <Button disabled={pending} type="submit" variant="outline">{pending ? "Checking…" : "Run inactivity sweep now"}</Button>
      <Feedback state={state} />
    </form>
  )
}
