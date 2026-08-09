import { ArrowLeft, PlugZap, ServerCog } from "lucide-react"
import Link from "next/link"

import { AutomationControls, ConnectionForm, GmailIngestionForm, GoogleDriveFolderPicker, GoogleWorkspaceDispatchForm } from "@/components/integrations/integration-forms"
import { GoogleSpreadsheetPicker } from "@/components/alerts/google-spreadsheet-picker"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getGoogleMailboxCandidates, getGoogleWorkspaceDispatchCandidates, getIntegrationWorkspace } from "@/lib/integrations/data"
import { redirect } from "next/navigation"

function formatDateTime(value: string | null) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(value))
}

const connectionNames: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_drive: "Google Drive",
  google_sheets: "Google Sheets",
  telegram: "Telegram",
}

export default async function CompanyConnectionsPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const workspace = await getIntegrationWorkspace()
  const [gmailMailboxes, googleWorkspaceAccounts] = await Promise.all([
    getGoogleMailboxCandidates(),
    getGoogleWorkspaceDispatchCandidates(),
  ])

  return <div className="mx-auto max-w-6xl space-y-6">
    <div><Link className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" href="/settings"><ArrowLeft className="size-4" />Settings</Link><h1 className="mt-5 text-3xl font-semibold">Connections</h1></div>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ServerCog className="size-5 text-primary" />Automation</CardTitle></CardHeader><CardContent className="space-y-6 pt-5"><AutomationControls /><div className="border-t pt-5"><GoogleWorkspaceDispatchForm candidates={googleWorkspaceAccounts} /></div></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">{workspace.connections.map((connection) => <Card key={connection.provider}><CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><PlugZap className="size-5 text-primary" />{connectionNames[connection.provider] ?? connection.display_name}</CardTitle><CardDescription className="mt-2">Last success: {formatDateTime(connection.last_success_at)}</CardDescription></div><Badge variant={connection.enabled ? "default" : "outline"}>{connection.enabled ? "Enabled" : "Disabled"}</Badge></div></CardHeader><CardContent className="space-y-4 pt-5">{connection.last_error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{connection.last_error}</p> : null}<ConnectionForm connection={connection} />{connection.provider === "gmail" ? <GmailIngestionForm candidates={gmailMailboxes} /> : null}{connection.provider === "google_drive" ? <GoogleDriveFolderPicker selectedId={connection.target_reference} selectedName={connection.configuration_notes?.replace(/^Selected folder:\s*/, "") ?? null} /> : null}{connection.provider === "google_sheets" ? <GoogleSpreadsheetPicker selectedId={connection.target_reference} selectedName={connection.configuration_notes?.replace(/^Selected spreadsheet:\s*/, "") ?? null} /> : null}</CardContent></Card>)}</div>
  </div>
}
