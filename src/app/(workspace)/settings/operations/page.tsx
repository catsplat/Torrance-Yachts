import { Activity, Bot, Database, Mail, ScanLine } from "lucide-react"
import { redirect } from "next/navigation"

import { QuarantineReconciliationForm } from "@/components/operations/operations-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getOperationsWorkspace } from "@/lib/operations/data"

function age(value: string | null) {
  if (!value) return "None waiting"
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} hr`
}

export default async function OperationsPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const health = await getOperationsWorkspace()
  const items = [
    { detail: `${health.database.gmail?.lag_seconds == null ? "Not synced" : `${Math.round(health.database.gmail.lag_seconds / 60)} min lag`}`, icon: Mail, issue: Boolean(health.database.gmail?.last_error), title: "Gmail" },
    { detail: `${health.database.ai.pending} queued · ${health.database.ai.permanent_failure} failed`, icon: Bot, issue: health.database.ai.permanent_failure > 0, title: "AI queue" },
    { detail: `${health.database.outbox.pending} queued · oldest ${age(health.database.outbox.oldest_pending_at)}`, icon: Activity, issue: health.database.outbox.failed > 0, title: "Delivery outbox" },
    { detail: health.scanner.detail, icon: ScanLine, issue: !health.scanner.ready || health.database.scanner.errors > 0, title: "Document scanner" },
    { detail: health.automation.detail, icon: Database, issue: health.automation.state === "attention", title: "Scheduler" },
  ]
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-3xl font-semibold">Operations</h1><p className="mt-2 text-sm text-muted-foreground">Queues, integrations and recovery.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(({ detail, icon: Icon, issue, title }) => <Card key={title}><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-sm text-muted-foreground">{detail}</p><Badge className="mt-3" variant={issue ? "destructive" : "outline"}>{issue ? "Attention" : "Ready"}</Badge></CardContent></Card>)}</div>
    <Card><CardHeader className="border-b"><CardTitle>Document recovery</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><div className="grid gap-2 text-sm sm:grid-cols-3"><p><span className="font-medium">Pending:</span> {health.database.scanner.pending}</p><p><span className="font-medium">Errors:</span> {health.database.scanner.errors}</p><p><span className="font-medium">Orphan candidates:</span> {health.database.scanner.orphan_candidates}</p></div><QuarantineReconciliationForm /></CardContent></Card>
  </div>
}
