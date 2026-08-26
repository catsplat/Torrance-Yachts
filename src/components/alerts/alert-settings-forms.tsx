"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"

import {
  createMyTelegramPairingAction,
  disconnectMyImapMailboxAction,
  disconnectMyGmailOauthAction,
  saveMyImapMailboxAction,
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
  mailboxConnected,
  phone,
  preferences,
  telegramChatId,
}: {
  mailboxConnected: boolean
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
          disabled={!mailboxConnected}
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

export function ImapMailboxForm({
  connections,
}: {
  connections: Array<{ account_email: string; enabled: boolean; folders: string[]; host: string; id: string; port: number; status: string; tls: boolean }>
}) {
  const [preset, setPreset] = useState("custom")
  const presetValues: Record<string, { host: string; port: string }> = {
    "icloud": { host: "imap.mail.me.com", port: "993" },
    "outlook": { host: "outlook.office365.com", port: "993" },
    "yahoo": { host: "imap.mail.yahoo.com", port: "993" },
    "zoho": { host: "imap.zoho.eu", port: "993" },
    "custom": { host: "", port: "993" },
  }
  const [state, action, pending] = useActionState(saveMyImapMailboxAction, initialState)
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(disconnectMyImapMailboxAction, initialState)
  return <div className="space-y-4">
    {connections.map((connection) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm" key={connection.id}>
      <div><p className="font-medium">{connection.account_email}</p><p className="mt-1 text-xs text-muted-foreground">{connection.host}:{connection.port} · {connection.folders.join(", ")} · {connection.status}</p></div>
      <form action={disconnectAction}><input name="connectionId" type="hidden" value={connection.id} /><Button disabled={disconnectPending} size="sm" type="submit" variant="outline">Disconnect</Button></form>
    </div>)}
    <form action={action} className="grid gap-3 border-t pt-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Email provider
        <select className="h-9 rounded-lg border bg-background px-3 text-sm" onChange={(event) => setPreset(event.target.value)} value={preset}>
          <option value="custom">Other IMAP provider</option><option value="icloud">iCloud Mail</option><option value="outlook">Outlook / Microsoft 365</option><option value="yahoo">Yahoo Mail</option><option value="zoho">Zoho Mail</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Email address<Input name="accountEmail" required type="email" /></label>
      <label className="grid gap-1 text-sm font-medium">App password<Input autoComplete="new-password" name="appPassword" required type="password" /><span className="text-xs font-normal text-muted-foreground">Create this in your mail provider; never use your normal mailbox password.</span></label>
      <label className="grid gap-1 text-sm font-medium">IMAP server<Input key={`${preset}-host`} defaultValue={presetValues[preset].host} name="host" placeholder="imap.example.com" required /></label>
      <label className="grid gap-1 text-sm font-medium">Port<Input key={`${preset}-port`} defaultValue={presetValues[preset].port} name="port" required type="number" /></label>
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Folders to monitor<Input defaultValue="INBOX" name="folders" required /></label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input defaultChecked name="tls" type="checkbox" />TLS encryption</label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input name="enabled" type="checkbox" />Start monitoring after saving</label>
      <div className="md:col-span-2"><Button disabled={pending} type="submit">{pending ? "Testing and saving…" : "Test and save IMAP mailbox"}</Button></div>
      <div className="md:col-span-2"><Feedback state={state} /><Feedback state={disconnectState} /></div>
    </form>
  </div>
}
