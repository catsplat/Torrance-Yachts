import { AlertTriangle, CheckCircle2, CircleDotDashed, ExternalLink, Hand } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getIntegrationActivationChecks } from "@/lib/integrations/readiness"

const presentation = {
  attention: { icon: AlertTriangle, label: "Verify", variant: "outline" as const },
  manual: { icon: Hand, label: "Manual by design", variant: "secondary" as const },
  ready: { icon: CheckCircle2, label: "Ready", variant: "default" as const },
  setup_required: { icon: CircleDotDashed, label: "Needs setup", variant: "outline" as const },
}

export default async function ActivationReadinessPage() {
  const checks = await getIntegrationActivationChecks()
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Provider activation</p><h1 className="mt-1 text-3xl font-semibold">Integration readiness</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Status is evidence, not automatic permission. Credentials stay outside the interface, and n8n workflows are activated only after synthetic end-to-end tests pass.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">{checks.map((check) => { const item = presentation[check.state]; const Icon = item.icon; return <Card key={check.key}><CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" />{check.title}</CardTitle><CardDescription className="mt-2">{check.description}</CardDescription></div><Badge variant={item.variant}>{item.label}</Badge></div></CardHeader><CardContent className="pt-5"><p className="text-sm leading-6 text-muted-foreground">{check.detail}</p></CardContent></Card> })}</div>
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5"><div><p className="font-medium">Full activation procedure</p><p className="mt-1 text-sm text-muted-foreground">Follow the operator runbook, capture test evidence, then complete the formal launch gate.</p></div><div className="flex gap-2"><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/settings/alerts">Personal connections <ExternalLink className="size-3.5" /></Link><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/settings/launch">Launch readiness <ExternalLink className="size-3.5" /></Link></div></CardContent></Card>
  </div>
}
