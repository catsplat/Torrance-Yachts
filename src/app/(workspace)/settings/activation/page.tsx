import { AlertTriangle, CheckCircle2, CircleDotDashed, ExternalLink, Hand } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getIntegrationActivationChecks } from "@/lib/integrations/readiness"
import { getCurrentUser } from "@/lib/auth/current-user"
import { redirect } from "next/navigation"

const presentation = {
  attention: { icon: AlertTriangle, label: "Verify", variant: "outline" as const },
  manual: { icon: Hand, label: "Manual by design", variant: "secondary" as const },
  ready: { icon: CheckCircle2, label: "Ready", variant: "default" as const },
  setup_required: { icon: CircleDotDashed, label: "Needs setup", variant: "outline" as const },
}

export default async function ActivationReadinessPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const checks = await getIntegrationActivationChecks()
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-3xl font-semibold">Connection status</h1></div>
    <div className="grid gap-4 lg:grid-cols-2">{checks.map((check) => { const item = presentation[check.state]; const Icon = item.icon; return <Card key={check.key}><CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" />{check.title}</CardTitle><CardDescription className="mt-2">{check.description}</CardDescription></div><Badge variant={item.variant}>{item.label}</Badge></div></CardHeader><CardContent className="pt-5"><p className="text-sm leading-6 text-muted-foreground">{check.detail}</p></CardContent></Card> })}</div>
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5"><p className="font-medium">Setup and launch</p><div className="flex gap-2"><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/settings/alerts">My connections <ExternalLink className="size-3.5" /></Link><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/settings/launch">Launch checks <ExternalLink className="size-3.5" /></Link></div></CardContent></Card>
  </div>
}
