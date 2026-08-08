"use client"

import { useActionState } from "react"

import {
  generateContractAiSuggestionAction,
  generateEmailAiSuggestionAction,
  reviseContractAiSuggestionAction,
  reviseEmailAiSuggestionAction,
  reviewAiSuggestionAction,
  type AiActionState,
} from "@/app/(workspace)/ai/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  aiClassificationValues,
  type ContractAiSuggestion,
  type EmailAiSuggestion,
} from "@/lib/ai/schemas"

const initialState: AiActionState = {}

function Feedback({ state }: { state: AiActionState }) {
  if (!state.message) return null
  return (
    <p
      aria-live="polite"
      className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}
    >
      {state.message}
    </p>
  )
}

export function GenerateEmailAiSuggestionForm({
  messageId,
  requestToken,
}: {
  messageId: string
  requestToken: string
}) {
  const [state, action, pending] = useActionState(generateEmailAiSuggestionAction, initialState)
  return (
    <form action={action} className="space-y-3">
      <input name="messageId" type="hidden" value={messageId} />
      <input name="requestToken" type="hidden" value={requestToken} />
      <Button disabled={pending} type="submit">
        {pending ? "Analysing…" : "Analyse email"}
      </Button>
      <Feedback state={state} />
    </form>
  )
}

export function GenerateContractAiSuggestionForm({
  bookingId,
  documentId,
  requestToken,
}: {
  bookingId: string
  documentId: string
  requestToken: string
}) {
  const [state, action, pending] = useActionState(generateContractAiSuggestionAction, initialState)
  return (
    <form action={action} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="documentId" type="hidden" value={documentId} />
      <input name="requestToken" type="hidden" value={requestToken} />
      <label className="grid gap-1 text-sm">
        Relevant contract clauses
        <textarea
          className="min-h-48 rounded-md border bg-background p-3 font-mono text-sm"
          maxLength={30000}
          minLength={50}
          name="contractText"
          placeholder="Paste only the clauses containing charter dates, ports, fee, tax, commission and instalments. Do not include passport or KYC identity data."
          required
        />
      </label>
      <div>
        <Button disabled={pending} type="submit">
          {pending ? "Extracting…" : "Extract contract details"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The pasted clauses are processed for this request and are not stored as a second contract copy.
      </p>
      <Feedback state={state} />
    </form>
  )
}

function AiReviewDecisionForm({
  returnPath,
  suggestionId,
}: {
  returnPath: string
  suggestionId: string
}) {
  const action = reviewAiSuggestionAction.bind(null, returnPath)
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <input name="suggestionId" type="hidden" value={suggestionId} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} name="approved" type="submit" value="true">
          Approve
        </Button>
        <Button
          disabled={pending}
          name="approved"
          type="submit"
          value="false"
          variant="outline"
        >
          Reject
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

function NullableInput({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue: number | string | null
  label: string
  name: string
  type?: "date" | "email" | "number" | "text"
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <Input defaultValue={defaultValue ?? ""} name={name} type={type} />
    </label>
  )
}

export function EmailAiSuggestionReview({
  messageId,
  output,
  status,
  suggestionId,
}: {
  messageId: string
  output: EmailAiSuggestion
  status: "approved" | "pending_review" | "rejected" | "superseded"
  suggestionId: string
}) {
  const [state, action, pending] = useActionState(reviseEmailAiSuggestionAction, initialState)
  if (status !== "pending_review") {
    return (
      <div className="space-y-3">
        <p className="text-sm">{output.summary}</p>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">{output.draft.subject || "No draft subject"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{output.draft.body || "No draft body"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          This suggestion is {status.replace("_", " ")} and is retained for audit.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <input name="suggestionId" type="hidden" value={suggestionId} />
        <label className="grid gap-1 text-sm">
          Suggested classification
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            defaultValue={output.classification}
            name="classification"
          >
            {aiClassificationValues.map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <NullableInput defaultValue={output.extracted.customer_name} label="Customer name" name="customerName" />
        <NullableInput defaultValue={output.extracted.customer_email} label="Customer email" name="customerEmail" type="email" />
        <NullableInput defaultValue={output.extracted.customer_phone} label="Customer phone" name="customerPhone" />
        <NullableInput defaultValue={output.extracted.company_name} label="Company" name="companyName" />
        <NullableInput defaultValue={output.extracted.requested_yacht_name} label="Requested yacht" name="requestedYachtName" />
        <NullableInput defaultValue={output.extracted.charter_start_date} label="Charter start" name="charterStartDate" type="date" />
        <NullableInput defaultValue={output.extracted.charter_end_date} label="Charter end" name="charterEndDate" type="date" />
        <NullableInput defaultValue={output.extracted.guest_count} label="Guests" name="guestCount" type="number" />
        <NullableInput defaultValue={output.extracted.embarkation_port} label="Embarkation port" name="embarkationPort" />
        <NullableInput defaultValue={output.extracted.disembarkation_port} label="Disembarkation port" name="disembarkationPort" />
        <NullableInput defaultValue={output.extracted.budget_amount} label="Budget" name="budgetAmount" type="number" />
        <NullableInput defaultValue={output.extracted.currency} label="Currency" name="currency" />
        <label className="grid gap-1 text-sm md:col-span-2">
          Summary
          <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={output.summary} name="summary" required />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Requirements, one per line
          <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={output.extracted.requirements.join("\n")} name="requirements" />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Draft subject
          <Input defaultValue={output.draft.subject} name="draftSubject" />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Draft body
          <textarea className="min-h-56 rounded-md border bg-background p-3 text-sm" defaultValue={output.draft.body} name="draftBody" />
        </label>
        <div className="md:col-span-2">
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Save corrections"}
          </Button>
        </div>
        <Feedback state={state} />
      </form>
      <AiReviewDecisionForm returnPath={`/emails/${messageId}`} suggestionId={suggestionId} />
    </div>
  )
}

export function ContractAiSuggestionReview({
  bookingId,
  output,
  status,
  suggestionId,
}: {
  bookingId: string
  output: ContractAiSuggestion
  status: "approved" | "pending_review" | "rejected" | "superseded"
  suggestionId: string
}) {
  const action = reviseContractAiSuggestionAction.bind(null, bookingId)
  const [state, formAction, pending] = useActionState(action, initialState)
  const instalments = output.extracted.instalments
  return (
    <div className="space-y-5">
      {status === "pending_review" ? (
        <form action={formAction} className="grid gap-3 md:grid-cols-2">
          <input name="suggestionId" type="hidden" value={suggestionId} />
          <NullableInput defaultValue={output.extracted.yacht_name} label="Yacht" name="yachtName" />
          <NullableInput defaultValue={output.extracted.charterer_name} label="Charterer" name="chartererName" />
          <NullableInput defaultValue={output.extracted.broker_name} label="Broker" name="brokerName" />
          <NullableInput defaultValue={output.extracted.broker_company_name} label="Broker company" name="brokerCompanyName" />
          <NullableInput defaultValue={output.extracted.charter_start_date} label="Charter start" name="charterStartDate" type="date" />
          <NullableInput defaultValue={output.extracted.charter_end_date} label="Charter end" name="charterEndDate" type="date" />
          <NullableInput defaultValue={output.extracted.embarkation_port} label="Embarkation port" name="embarkationPort" />
          <NullableInput defaultValue={output.extracted.disembarkation_port} label="Disembarkation port" name="disembarkationPort" />
          <NullableInput defaultValue={output.extracted.charter_fee} label="Charter fee" name="charterFee" type="number" />
          <NullableInput defaultValue={output.extracted.currency} label="Currency" name="currency" />
          <NullableInput defaultValue={output.extracted.tax_rate} label="Tax rate %" name="taxRate" type="number" />
          <NullableInput defaultValue={output.extracted.commission_rate} label="Commission rate %" name="commissionRate" type="number" />
          {[0, 1, 2].map((index) => (
            <div className="contents" key={index}>
              <NullableInput defaultValue={instalments[index]?.due_date ?? null} label={`Instalment ${index + 1} date`} name={`instalment${index + 1}Date`} type="date" />
              <NullableInput defaultValue={instalments[index]?.amount ?? null} label={`Instalment ${index + 1} amount`} name={`instalment${index + 1}Amount`} type="number" />
            </div>
          ))}
          <label className="grid gap-1 text-sm md:col-span-2">
            Summary
            <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={output.summary} name="summary" required />
          </label>
          <div className="md:col-span-2">
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Save corrections"}
            </Button>
          </div>
          <Feedback state={state} />
        </form>
      ) : (
        <p className="text-sm">{output.summary}</p>
      )}
      {status === "pending_review" ? (
        <AiReviewDecisionForm
          returnPath={`/bookings/${bookingId}/documents`}
          suggestionId={suggestionId}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          This suggestion is {status.replace("_", " ")} and cannot alter booking records.
        </p>
      )}
    </div>
  )
}
