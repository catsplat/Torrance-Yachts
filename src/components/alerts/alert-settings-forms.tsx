"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"

import {
  createMyTelegramPairingAction,
  disconnectMyGmailOauthAction,
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

export function TelegramPairingForm({
  configured,
  connected,
}: {
  configured: boolean
  connected: boolean
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createMyTelegramPairingAction, initialState)

  if (connected) {
    return <p className="text-sm leading-6 text-muted-foreground">Telegram is connected.</p>
  }
  if (!configured) {
    return <p className="text-sm text-muted-foreground">Telegram is not available yet.</p>
  }
  return <form action={action} className="space-y-3">
    <p className="text-sm leading-6 text-muted-foreground">Open the company bot and press <strong>Start</strong>.</p>
    {state.pairingUrl ? <a className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={state.pairingUrl} rel="noreferrer" target="_blank">Open Telegram</a> : <Button disabled={pending} type="submit">{pending ? "Creating link…" : "Connect Telegram"}</Button>}
    {state.pairingUrl ? <Button onClick={() => router.refresh()} type="button" variant="outline">Check connection</Button> : null}
    <Feedback state={state} />
  </form>
}

function Toggle({
  defaultChecked,
  disabled = false,
  label,
  name,
}: {
  defaultChecked: boolean
  disabled?: boolean
  label: string
  name: string
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <input
        className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
      <span className="text-sm font-medium">{label}</span>
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
  gmailConnected,
  phone,
  preferences,
  telegramChatId,
}: {
  gmailConnected: boolean
  phone: string | null
  preferences: Preferences
  telegramChatId: string | null
}) {
  const [state, action, pending] = useActionState(
    updateMyAlertPreferencesAction,
    initialState,
  )
  return (
    <form action={action} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Contact</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Alert email
            <Input defaultValue={preferences.notification_email ?? ""} name="notificationEmail" placeholder="you@company.com" type="email" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Phone number
            <Input defaultValue={phone ?? ""} name="phone" placeholder="+44 7700 900 000" type="tel" />
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-base font-semibold">Channels</h2>
        <div className="grid gap-3 md:grid-cols-3">
        <Toggle
          defaultChecked={preferences.in_app_enabled}
          label="In-app"
          name="inAppEnabled"
        />
        <Toggle
          defaultChecked={preferences.telegram_enabled}
          label="Telegram"
          name="telegramEnabled"
        />
        <Toggle
          defaultChecked={preferences.email_enabled}
          disabled={!gmailConnected}
          label="Email"
          name="emailEnabled"
        />
        </div>
        <input name="telegramChatId" type="hidden" value={telegramChatId ?? ""} />
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-base font-semibold">Topics</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Toggle defaultChecked={preferences.new_enquiry_enabled} label="New enquiries" name="newEnquiryEnabled" />
          <Toggle defaultChecked={preferences.follow_up_enabled} label="Follow-ups" name="followUpEnabled" />
          <Toggle defaultChecked={preferences.internal_email_enabled} label="Internal emails" name="internalEmailEnabled" />
          <Toggle defaultChecked={preferences.unknown_email_enabled} label="Unclassified emails" name="unknownEmailEnabled" />
          <Toggle defaultChecked={preferences.task_enabled} label="Tasks" name="taskEnabled" />
          <Toggle defaultChecked={preferences.payment_enabled} label="Payments" name="paymentEnabled" />
          <Toggle defaultChecked={preferences.charter_enabled} label="Charter dates" name="charterEnabled" />
          <Toggle defaultChecked={preferences.integration_failure_enabled} label="Connection problems" name="integrationFailureEnabled" />
          <Toggle defaultChecked={preferences.ai_summary_enabled} label="Email summaries" name="aiSummaryEnabled" />
        </div>
      </section>
      <section className="space-y-3 border-t pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</Button>
          <Feedback state={state} />
        </div>
      </section>
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
      <Button disabled={pending} type="submit" variant="destructive">
        Disconnect Google Workspace
      </Button>
      <Feedback state={state} />
    </form>
  )
}
