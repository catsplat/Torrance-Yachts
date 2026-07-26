import { ArrowLeft, PlugZap, ServerCog } from "lucide-react"
import Link from "next/link"

import { AutomationControls, ConnectionForm } from "@/components/integrations/integration-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getIntegrationWorkspace } from "@/lib/integrations/data"

function formatDateTime(value: string | null) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(value))
}

export default async function CompanyConnectionsPage() {
  const [workspace, user] = await Promise.all([getIntegrationWorkspace(), getCurrentUser()])
  if (user?.role !== "administrator") return null

  return <div className="mx-auto max-w-6xl space-y-6">
    <div><Link className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" href="/settings"><ArrowLeft className="size-4" />Back to settings</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Administrator only</p><h1 className="mt-1 text-3xl font-semibold">Company connections</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Enable and inspect the company&apos;s delivery adapters here. This does not bypass notification approval or allow integrations to change bookings.</p></div>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ServerCog className="size-5 text-primary" />Local automation worker</CardTitle><CardDescription>n8n schedules adapter work only. PostgreSQL remains the operational source of truth.</CardDescription></CardHeader><CardContent className="pt-5"><AutomationControls /></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">{workspace.connections.map((connection) => <Card key={connection.provider}><CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><PlugZap className="size-5 text-primary" />{connection.display_name}</CardTitle><CardDescription className="mt-2">Last success: {formatDateTime(connection.last_success_at)}</CardDescription></div><Badge variant={connection.enabled ? "default" : "outline"}>{connection.enabled ? "Enabled" : "Disabled"}</Badge></div></CardHeader><CardContent className="space-y-4 pt-5">{connection.last_error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{connection.last_error}</p> : null}<ConnectionForm connection={connection} /></CardContent></Card>)}</div>
  </div>
}
