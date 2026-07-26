import { BellRing, CheckCircle2, CircleDotDashed, LockKeyhole, Mail, Send } from "lucide-react"
import Link from "next/link"

import {
  AlertPreferencesForm,
  GmailOauthDisconnectForm,
  TelegramPairingForm,
} from "@/components/alerts/alert-settings-forms"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getGoogleOAuthConfiguration } from "@/lib/integrations/google-oauth-server"
import { getTelegramPairingConfiguration } from "@/lib/integrations/telegram-pairing"
import { createClient } from "@/lib/supabase/server"

type PageProps = { searchParams: Promise<{ google?: string }> }

const googleMessages: Record<string, string> = {
  "account-error": "Google did not return a verified account email. Try again with the intended work account.",
  "configuration-error": "Google connection is not configured correctly. Ask an administrator to check the company setup.",
  connected: "Your Google inbox is connected securely.",
  declined: "Google connection was cancelled. No inbox access was granted.",
  "invalid-state": "The secure connection request expired or could not be verified. Start again from this page.",
  "not-configured": "Google connection is not configured for this workspace yet.",
  "refresh-token-missing": "Google did not provide ongoing access. Start the connection again and approve access.",
  "save-error": "The Google connection could not be saved. Nothing was changed; please try again.",
  "token-error": "Google could not complete the secure connection. Please try again.",
}

function SetupState({ complete, label }: { complete: boolean; label: string }) {
  const Icon = complete ? CheckCircle2 : CircleDotDashed
  return <div className="flex items-center gap-2 text-sm"><Icon className={complete ? "size-4 text-emerald-600 dark:text-emerald-400" : "size-4 text-muted-foreground"} /><span>{label}</span></div>
}

export default async function PersonalAlertsSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) return null
  const notices = await searchParams
  const supabase = await createClient()
  const [profileResult, preferenceResult, oauthResult] = await Promise.all([
    supabase.from("profiles").select("phone, telegram_chat_id").eq("id", user.id).single(),
    supabase.from("user_notification_preferences").select("*").eq("user_id", user.id).single(),
    supabase.rpc("get_my_oauth_connections"),
  ])
  if (profileResult.error || preferenceResult.error || oauthResult.error) {
    throw new Error("Unable to load your personal alert settings.")
  }
  const gmail = oauthResult.data?.find((connection) => connection.provider === "gmail")
  const gmailConnected = gmail?.status === "connected"
  const googleConfigured = getGoogleOAuthConfiguration().configured
  const telegramPairingConfigured = getTelegramPairingConfiguration().configured
  const contactReady = Boolean(profileResult.data.phone || preferenceResult.data.notification_email)
  const telegramReady = Boolean(profileResult.data.telegram_chat_id && preferenceResult.data.telegram_enabled)
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Personal setup</p>
        <h1 className="mt-1 text-3xl font-semibold">Your alerts and connections</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Set up how the private workspace reaches you. Company-wide systems are configured separately by an administrator.
        </p>
      </div>

      {notices.google ? <p aria-live="polite" className={notices.google === "connected" ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200" : "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"}>{googleMessages[notices.google] ?? "Google connection status updated."}</p> : null}

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <SetupState complete={contactReady} label="Contact details" />
          <SetupState complete={telegramReady} label="Telegram delivery" />
          <SetupState complete={gmailConnected} label="Google inbox" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><BellRing className="size-5 text-primary" />Your alert preferences</CardTitle><CardDescription>AI content is labelled as a suggestion. External actions still require your approval.</CardDescription></CardHeader>
        <CardContent className="pt-6">
          <AlertPreferencesForm
            gmailConnected={gmailConnected}
            phone={profileResult.data.phone}
            preferences={preferenceResult.data}
            telegramChatId={profileResult.data.telegram_chat_id}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
        <Card>
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Send className="size-5 text-primary" />Telegram delivery</CardTitle><CardDescription>Pair your private Telegram chat with the company bot in one short, secure step.</CardDescription></CardHeader>
          <CardContent className="pt-5"><TelegramPairingForm configured={telegramPairingConfigured} connected={telegramReady} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              Google inbox
            </CardTitle>
            <CardDescription>
              Connect the inbox you use for internal alerts and controlled email drafts. You approve access directly with Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {gmailConnected ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/25 p-3 text-sm">
                <Badge>Connected</Badge><span>{gmail.account_email}</span>
              </div>
            ) : null}
            {gmailConnected ? <p className="text-sm leading-6 text-muted-foreground">This connection is used only by approved internal delivery work. It cannot confirm bookings, send broker correspondence automatically, or change operational data.</p> : googleConfigured ? <Link className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/api/integrations/google/connect">Connect Google inbox</Link> : <p className="rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">Google connection will appear here once an administrator has added the company Google OAuth application. You will never be asked for a client secret or refresh token.</p>}
            {gmailConnected ? (
              <div className="border-t pt-5">
                <GmailOauthDisconnectForm />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-primary" />
              Security boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm text-muted-foreground">
            <p>
              Telegram pairing happens through one company-controlled bot. Its
              token and webhook secret stay on the server; the normal setup path
              does not expose a chat ID.
            </p>
            <p>
              Google approval is completed on Google&apos;s own page. Ongoing access is encrypted in Supabase Vault; it is never shown back in Settings.
            </p>
            <p className="flex items-start gap-2 text-foreground">
              <Send className="mt-0.5 size-4 shrink-0 text-primary" />
              Automatic delivery is restricted to internal staff alerts. Broker,
              captain, invoice, booking, and status actions remain reviewable.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
