import { BellRing, KeyRound, LockKeyhole, Send } from "lucide-react"

import {
  AlertPreferencesForm,
  GmailOauthDisconnectForm,
  GmailOauthForm,
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
import { createClient } from "@/lib/supabase/server"

export default async function PersonalAlertsSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null
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
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Personal delivery
        </p>
        <h1 className="mt-1 text-3xl font-semibold">My alerts and connections</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Choose which operational events reach you and where. These settings apply
          only to your staff account.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" />
            Alert routes and topics
          </CardTitle>
          <CardDescription>
            AI content is labelled as a suggestion. External actions still require
            human approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <AlertPreferencesForm
            phone={profileResult.data.phone}
            preferences={preferenceResult.data}
            telegramChatId={profileResult.data.telegram_chat_id}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Gmail OAuth
            </CardTitle>
            <CardDescription>
              Required only if you enable email alerts. Values are encrypted in
              Supabase Vault and cannot be read back in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {gmail ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/25 p-3 text-sm">
                <Badge variant={gmail.status === "connected" ? "default" : "outline"}>
                  {gmail.status.replaceAll("_", " ")}
                </Badge>
                <span>{gmail.account_email}</span>
              </div>
            ) : null}
            <GmailOauthForm />
            {gmail && gmail.status !== "disconnected" ? (
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
              Telegram uses one company-controlled bot token stored on the server.
              You provide only your destination chat ID.
            </p>
            <p>
              Gmail client credentials and refresh tokens are encrypted before they
              are stored. The normal application role cannot query decrypted values.
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
