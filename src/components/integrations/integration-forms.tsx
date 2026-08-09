"use client"

import { useActionState } from "react"

import {
  approveInvoiceProfileAction,
  configureGmailIngestionAction,
  createNotificationDraftAction,
  createInvoiceProfileAction,
  generateInvoiceAction,
  type IntegrationActionState,
  queueDriveSyncAction,
  queueSheetSnapshotAction,
  retryDeliveryAction,
  reviewNotificationAction,
  runAutomationNowAction,
  updateConnectionAction,
} from "@/app/(workspace)/integrations/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Tables } from "@/types/database"

const initialState: IntegrationActionState = {}

function Feedback({ state }: { state: IntegrationActionState }) {
  if (!state.message) return null
  return (
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
      {state.message}
    </p>
  )
}

export function ConnectionForm({
  connection,
}: {
  connection: Tables<"integration_connections">
}) {
  const [state, action, pending] = useActionState(updateConnectionAction, initialState)
  const connectionLabel = connection.provider === "gmail"
    ? "Create approved drafts and staff email alerts"
    : "Use this connection"
  const showAdvanced = !["gmail", "google_sheets"].includes(connection.provider)
  return (
    <form action={action} className="space-y-4">
      <input name="provider" type="hidden" value={connection.provider} />
      <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium">
        <input defaultChecked={connection.enabled} name="enabled" type="checkbox" />
        {connectionLabel}
      </label>
      {showAdvanced ? <details className="rounded-lg border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">Advanced</summary>
        <div className="grid gap-3 border-t p-3">
          <label className="grid gap-1.5 text-sm">
            Resource ID
            <Input defaultValue={connection.target_reference ?? ""} name="targetReference" />
          </label>
          <label className="grid gap-1.5 text-sm">
            Notes
            <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={connection.configuration_notes ?? ""} name="configurationNotes" />
          </label>
        </div>
      </details> : null}
      <Button disabled={pending} type="submit" variant="outline">{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  )
}

type GmailMailboxCandidate = {
  account_email: string
  display_name: string
  ingestion_enabled: boolean
  last_error: string | null
  last_failure_at: string | null
  last_success_at: string | null
  selected: boolean
  user_id: string
}

export function GmailIngestionForm({ candidates }: { candidates: GmailMailboxCandidate[] }) {
  const [state, action, pending] = useActionState(configureGmailIngestionAction, initialState)
  const selected = candidates.find((candidate) => candidate.selected)
  return (
    <form action={action} className="space-y-4 border-t pt-4">
      <div>
        <p className="text-sm font-medium">Incoming mail</p>
        <p className="mt-1 text-xs text-muted-foreground">{selected?.last_error ?? "Choose the connected inbox used for enquiries."}</p>
      </div>
      {candidates.length ? <label className="grid gap-2 text-sm font-medium">Inbox
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={selected?.user_id ?? candidates[0]?.user_id} name="userId">
          {candidates.map((candidate) => <option key={candidate.user_id} value={candidate.user_id}>{candidate.display_name} · {candidate.account_email}</option>)}
        </select>
      </label> : <p className="text-sm text-muted-foreground">No staff Google account is connected.</p>}
      <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium">
        <input defaultChecked={selected?.ingestion_enabled ?? false} disabled={!candidates.length} name="enabled" type="checkbox" />
        Monitor this inbox
      </label>
      <Button disabled={pending || !candidates.length} type="submit" variant="outline">{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  )
}

export function NotificationReviewForm({ notificationId }: { notificationId: string }) {
  const [state, action, pending] = useActionState(reviewNotificationAction, initialState)
  return (
    <form action={action} className="grid gap-2">
      <input name="notificationId" type="hidden" value={notificationId} />
      <div className="flex gap-2">
        <Button disabled={pending} name="approved" type="submit" value="true">Approve and queue</Button>
        <Button disabled={pending} name="approved" type="submit" value="false" variant="outline">Cancel</Button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

export function NotificationDraftForm({
  contacts,
  users,
}: {
  contacts: Array<{ email: string | null; full_name: string; id: string }>
  users: Array<{ display_name: string; email: string; id: string; telegram_chat_id: string | null }>
}) {
  const [state, action, pending] = useActionState(createNotificationDraftAction, initialState)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input name="sourceType" type="hidden" value="user" />
      <input name="sourceId" type="hidden" value={users[0]?.id ?? "00000000-0000-4000-8000-000000000000"} />
      <label className="grid gap-1 text-sm">Recipient
        <select className="h-9 rounded-md border bg-background px-3 text-sm" name="recipient" required>
          <optgroup label="Internal users">{users.map((user) => <option key={user.id} value={`user:${user.id}`}>{user.display_name} · {user.telegram_chat_id ? "Telegram configured" : user.email}</option>)}</optgroup>
          <optgroup label="External contacts">{contacts.map((contact) => <option key={contact.id} value={`contact:${contact.id}`}>{contact.full_name} · {contact.email}</option>)}</optgroup>
        </select>
      </label>
      <label className="grid gap-1 text-sm">Channel
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="telegram" name="channel">
          <option value="telegram">Telegram</option>
          <option value="email_draft">Gmail draft</option>
          <option value="in_app">In-app only</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">Priority
        <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="normal" name="priority">
          {["low", "normal", "high", "urgent"].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Notification type<Input defaultValue="manual_message" name="notificationType" required /></label>
      <label className="grid gap-1 text-sm">Action URL<Input defaultValue="/integrations" name="actionUrl" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Title<Input name="title" required /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Reviewed message<textarea className="min-h-36 rounded-md border bg-background p-3 text-sm" name="body" required /></label>
      <div><Button disabled={pending} type="submit">Create review draft</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function DeliveryRetryForm({ deliveryId }: { deliveryId: string }) {
  const [state, action, pending] = useActionState(retryDeliveryAction, initialState)
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input name="deliveryId" type="hidden" value={deliveryId} />
      <Button disabled={pending} type="submit" variant="outline">Retry delivery</Button>
      <Feedback state={state} />
    </form>
  )
}

export function AutomationControls() {
  const [tickState, tickAction, tickPending] = useActionState(runAutomationNowAction, initialState)
  const [sheetState, sheetAction, sheetPending] = useActionState(queueSheetSnapshotAction, initialState)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={tickAction} className="space-y-2 rounded-lg border p-4">
        <p className="font-medium">Update reminders</p>
        <p className="text-sm text-muted-foreground">Check tasks, payments and Gmail actions.</p>
        <Button disabled={tickPending} type="submit">Update now</Button>
        <Feedback state={tickState} />
      </form>
      <form action={sheetAction} className="space-y-2 rounded-lg border p-4">
        <p className="font-medium">Reporting spreadsheet</p>
        <p className="text-sm text-muted-foreground">Refresh the connected Google Sheet.</p>
        <Button disabled={sheetPending} type="submit" variant="outline">Refresh sheet</Button>
        <Feedback state={sheetState} />
      </form>
    </div>
  )
}

export function DriveSyncForm({ bookingId, documentId }: { bookingId: string; documentId: string }) {
  const [state, action, pending] = useActionState(queueDriveSyncAction, initialState)
  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="documentId" type="hidden" value={documentId} />
      <Button disabled={pending} type="submit" variant="outline">Queue Drive copy</Button>
      <Feedback state={state} />
    </form>
  )
}

export function InvoiceProfileForm() {
  const [state, action, pending] = useActionState(createInvoiceProfileAction, initialState)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Profile name<Input name="profileName" required /></label>
      <label className="grid gap-1 text-sm">Issuer name<Input name="issuerName" required /></label>
      <label className="grid gap-1 text-sm">Issuer address<textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" name="issuerAddress" required /></label>
      <label className="grid gap-1 text-sm">Recipient address<textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" name="recipientAddress" required /></label>
      <label className="grid gap-1 text-sm">Recipient name<Input name="recipientName" required /></label>
      <label className="grid gap-1 text-sm">Recipient email<Input name="recipientEmail" type="email" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Service description template<Input name="serviceDescriptionTemplate" required /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Payment instructions<textarea className="min-h-28 rounded-md border bg-background p-3 text-sm" name="paymentInstructions" required /></label>
      <div><Button disabled={pending} type="submit">Create draft profile</Button></div>
      <Feedback state={state} />
    </form>
  )
}

export function InvoiceProfileApprovalForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(approveInvoiceProfileAction, initialState)
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input name="profileId" type="hidden" value={profileId} />
      <Button disabled={pending} type="submit" variant="outline">Approve this version</Button>
      <Feedback state={state} />
    </form>
  )
}

export function InvoiceGenerationForm({
  bookingId,
  defaultDescription,
  profiles,
}: {
  bookingId: string
  defaultDescription: string
  profiles: Array<Pick<Tables<"invoice_profiles">, "id" | "profile_name" | "version_number">>
}) {
  const [state, action, pending] = useActionState(generateInvoiceAction, initialState)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input name="bookingId" type="hidden" value={bookingId} />
      <label className="grid gap-1 text-sm">Approved invoice profile
        <select className="h-9 rounded-md border bg-background px-3 text-sm" name="invoiceProfileId" required>
          <option value="">Select profile</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.profile_name} v{profile.version_number}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Invoice number<Input name="invoiceNumber" required /></label>
      <label className="grid gap-1 text-sm">Issue date<Input defaultValue={new Date().toISOString().slice(0, 10)} name="issueDate" required type="date" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Reviewed service description<Input defaultValue={defaultDescription} name="serviceDescription" required /></label>
      <div><Button disabled={pending} type="submit">Generate private PDF</Button></div>
      <Feedback state={state} />
    </form>
  )
}
