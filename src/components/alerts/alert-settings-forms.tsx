"use client"

import { useActionState } from "react"

import {
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

function Toggle({
  defaultChecked,
  description,
  disabled = false,
  label,
  name,
}: {
  defaultChecked: boolean
  description: string
  disabled?: boolean
  label: string
  name: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <input
        className="mt-1 size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        defaultChecked={defaultChecked}
        disabled={disabled}
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
    <form action={action} className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Where should we reach you?</h2>
          <p className="mt-1 text-sm text-muted-foreground">These details belong to your staff account. They are never shown to brokers or clients.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Alert email
            <Input defaultValue={preferences.notification_email ?? ""} name="notificationEmail" placeholder="you@company.com" type="email" />
            <span className="text-xs font-normal leading-5 text-muted-foreground">Used only for internal operational alerts when email delivery is enabled.</span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Phone number
            <Input defaultValue={phone ?? ""} name="phone" placeholder="+44 7700 900 000" type="tel" />
            <span className="text-xs font-normal leading-5 text-muted-foreground">Kept for operational contact and future SMS support. It does not enable SMS today.</span>
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-base font-semibold">How should alerts arrive?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Keep in-app notifications on so important work remains visible in the private workspace.</p>
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
          description="Uses the shared company bot. Start a chat with it, then enter the chat ID supplied by your administrator."
          label="Telegram"
          name="telegramEnabled"
        />
        <Toggle
          defaultChecked={preferences.email_enabled}
          description={gmailConnected ? "Sends internal alerts through your connected Google inbox." : "Connect a Google inbox below before this delivery route can be enabled."}
          disabled={!gmailConnected}
          label="Email"
          name="emailEnabled"
        />
        </div>
        <label className="grid max-w-md gap-2 text-sm font-medium">
          Telegram chat ID
          <Input defaultValue={telegramChatId ?? ""} name="telegramChatId" placeholder="Provided after you start the company bot" />
          <span className="text-xs font-normal leading-5 text-muted-foreground">Telegram bots do not support a staff sign-in. This private destination ID tells the company bot where to deliver your alerts.</span>
        </label>
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-base font-semibold">What needs your attention?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the operational events you want to receive. AI summaries are always labelled as suggestions.</p>
        </div>
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
      </section>
      <section className="space-y-3 border-t pt-6">
        <label className="grid max-w-xl gap-2 text-sm font-medium">
          Brief note for the change log
          <Input name="reason" placeholder="For example: setting up my work alerts" required />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} type="submit">{pending ? "Saving preferences…" : "Save my preferences"}</Button>
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
      <Input name="reason" placeholder="Reason for disconnecting Gmail" required />
      <Button disabled={pending} type="submit" variant="destructive">
        Disconnect and delete credentials
      </Button>
      <Feedback state={state} />
    </form>
  )
}
