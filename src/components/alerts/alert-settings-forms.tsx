"use client"

import { useActionState } from "react"

import {
  disconnectMyGmailOauthAction,
  saveMyGmailOauthAction,
  updateMyAlertPreferencesAction,
  type AlertSettingsActionState,
} from "@/app/(workspace)/settings/alerts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: AlertSettingsActionState = {}

function Feedback({ state }: { state: AlertSettingsActionState }) {
  if (!state.message) return null
  return (
    <p
      aria-live="polite"
      className={state.success ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}
    >
      {state.message}
    </p>
  )
}

function Toggle({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked: boolean
  description: string
  label: string
  name: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <input
        className="mt-1 size-4 accent-primary"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

type Preferences = {
  ai_summary_enabled: boolean
  charter_enabled: boolean
  email_enabled: boolean
  follow_up_enabled: boolean
  in_app_enabled: boolean
  integration_failure_enabled: boolean
  internal_email_enabled: boolean
  new_enquiry_enabled: boolean
  notification_email: string | null
  payment_enabled: boolean
  task_enabled: boolean
  telegram_enabled: boolean
  unknown_email_enabled: boolean
}

export function AlertPreferencesForm({
  phone,
  preferences,
  telegramChatId,
}: {
  phone: string | null
  preferences: Preferences
  telegramChatId: string | null
}) {
  const [state, action, pending] = useActionState(
    updateMyAlertPreferencesAction,
    initialState,
  )
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          defaultValue={preferences.notification_email ?? ""}
          name="notificationEmail"
          placeholder="Alert email"
          type="email"
        />
        <Input
          defaultValue={telegramChatId ?? ""}
          name="telegramChatId"
          placeholder="Telegram chat ID"
        />
        <Input defaultValue={phone ?? ""} name="phone" placeholder="Phone number" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Toggle
          defaultChecked={preferences.in_app_enabled}
          description="Always available in the private notification centre."
          label="In-app"
          name="inAppEnabled"
        />
        <Toggle
          defaultChecked={preferences.telegram_enabled}
          description="Uses the shared company bot and your personal chat ID."
          label="Telegram"
          name="telegramEnabled"
        />
        <Toggle
          defaultChecked={preferences.email_enabled}
          description="Sends internal alerts through your encrypted Gmail connection."
          label="Email"
          name="emailEnabled"
        />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium">Topics</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Toggle defaultChecked={preferences.new_enquiry_enabled} description="New incoming charter requests." label="New enquiries" name="newEnquiryEnabled" />
          <Toggle defaultChecked={preferences.follow_up_enabled} description="Replies linked to active enquiry threads." label="Follow-ups" name="followUpEnabled" />
          <Toggle defaultChecked={preferences.internal_email_enabled} description="Relevant company correspondence." label="Internal emails" name="internalEmailEnabled" />
          <Toggle defaultChecked={preferences.unknown_email_enabled} description="Low-confidence messages requiring review." label="Unknown emails" name="unknownEmailEnabled" />
          <Toggle defaultChecked={preferences.task_enabled} description="Due and overdue operational tasks." label="Tasks" name="taskEnabled" />
          <Toggle defaultChecked={preferences.payment_enabled} description="Contract instalment due dates." label="Payments" name="paymentEnabled" />
          <Toggle defaultChecked={preferences.charter_enabled} description="Charter start and end actions." label="Charter milestones" name="charterEnabled" />
          <Toggle defaultChecked={preferences.integration_failure_enabled} description="Administrator-only provider failures." label="Integration failures" name="integrationFailureEnabled" />
          <Toggle defaultChecked={preferences.ai_summary_enabled} description="Include clearly labelled AI summaries and suggested replies." label="AI summaries" name="aiSummaryEnabled" />
        </div>
      </div>
      <Input
        name="reason"
        placeholder="Reason for changing your alert settings"
        required
      />
      <Button disabled={pending} type="submit">Save my alert settings</Button>
      <Feedback state={state} />
    </form>
  )
}
export function GmailOauthForm() {
  const [state, action, pending] = useActionState(
    saveMyGmailOauthAction,
    initialState,
  )
  return (
    <form action={action} className="grid gap-3">
      <Input name="accountEmail" placeholder="Google account email" required type="email" />
      <Input autoComplete="off" name="clientId" placeholder="OAuth client ID" required />
      <Input autoComplete="new-password" name="clientSecret" placeholder="OAuth client secret" required type="password" />
      <Input autoComplete="new-password" name="refreshToken" placeholder="OAuth refresh token" required type="password" />
      <Input
        defaultValue="https://www.googleapis.com/auth/gmail.send"
        name="scopes"
        placeholder="Space-separated OAuth scopes"
        required
      />
      <Input name="reason" placeholder="Reason for connecting this mailbox" required />
      <Button disabled={pending} type="submit" variant="outline">
        Encrypt and save Gmail credentials
      </Button>
      <Feedback state={state} />
    </form>
  )
}

export function GmailOauthDisconnectForm() {
  const [state, action, pending] = useActionState(
    disconnectMyGmailOauthAction,
    initialState,
  )
  return (
    <form action={action} className="grid gap-3">
      <Input name="reason" placeholder="Reason for disconnecting Gmail" required />
      <Button disabled={pending} type="submit" variant="destructive">
        Disconnect and delete credentials
      </Button>
      <Feedback state={state} />
    </form>
  )
}
