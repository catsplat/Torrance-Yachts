"use client"

import { useActionState } from "react"

import {
  approveInvoiceProfileAction,
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
  return (
    <form action={action} className="grid gap-3">
      <input name="provider" type="hidden" value={connection.provider} />
      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={connection.enabled} name="enabled" type="checkbox" />
        Enable delivery queue
      </label>
      <label className="grid gap-1 text-sm">
        Target reference
        <Input defaultValue={connection.target_reference ?? ""} name="targetReference" placeholder="Calendar ID, Sheet ID, Drive folder ID, or internal label" />
      </label>
      <label className="grid gap-1 text-sm">
        Configuration notes
        <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={connection.configuration_notes ?? ""} name="configurationNotes" />
      </label>
      <Button disabled={pending} type="submit" variant="outline">Save metadata</Button>
      <Feedback state={state} />
    </form>
  )
}

export function NotificationReviewForm({ notificationId }: { notificationId: string }) {
  const [state, action, pending] = useActionState(reviewNotificationAction, initialState)
  return (
    <form action={action} className="grid gap-2">
      <input name="notificationId" type="hidden" value={notificationId} />
      <Input name="reason" placeholder="Recipient and wording checked" required />
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
    <form action={action} className="grid gap-2">
      <input name="deliveryId" type="hidden" value={deliveryId} />
      <Input name="reason" placeholder="Reason for operator retry" required />
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
        <p className="font-medium">Automation tick</p>
        <p className="text-sm text-muted-foreground">Materialise reminders, Gmail actions, and internal calendar records now.</p>
        <Button disabled={tickPending} type="submit">Run now</Button>
        <Feedback state={tickState} />
      </form>
      <form action={sheetAction} className="space-y-2 rounded-lg border p-4">
        <p className="font-medium">Google Sheets snapshot</p>
        <p className="text-sm text-muted-foreground">Queue a one-way workbook snapshot from PostgreSQL.</p>
        <Button disabled={sheetPending} type="submit" variant="outline">Queue snapshot</Button>
        <Feedback state={sheetState} />
      </form>
    </div>
  )
}

export function DriveSyncForm({ bookingId, documentId }: { bookingId: string; documentId: string }) {
  const [state, action, pending] = useActionState(queueDriveSyncAction, initialState)
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="documentId" type="hidden" value={documentId} />
      <Input name="reason" placeholder="Why this verified copy should be placed in Drive" required />
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
    <form action={action} className="grid gap-2">
      <input name="profileId" type="hidden" value={profileId} />
      <Input name="reason" placeholder="Private details checked" required />
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
