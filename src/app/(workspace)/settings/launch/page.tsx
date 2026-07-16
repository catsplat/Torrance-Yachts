import { AlertTriangle, CheckCircle2, Cloud, DatabaseBackup, KeyRound, Rocket, ShieldCheck } from "lucide-react"

import { BackupVerificationForm, LaunchCheckForm } from "@/components/tutorial/tutorial-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getLaunchReadinessWorkspace } from "@/lib/tutorial/data"

const categoryLabels: Record<string, string> = {
  acceptance: "Client acceptance",
  access: "Identity and access",
  backup: "Backup and recovery",
  deployment: "Hosted deployment",
  integrations: "External integrations",
  monitoring: "Monitoring and incidents",
  privacy: "Security and privacy",
}

export default async function LaunchReadinessPage() {
  const workspace = await getLaunchReadinessWorkspace()
  const grouped = Map.groupBy(workspace.checks, (check) => check.category)
  const configuredCount = workspace.configuration.filter((item) => item.configured).length
  return (
    <div className="mx-auto max-w-7xl space-y-5" data-tutorial-anchor="launch-readiness">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Production acceptance gate</p>
        <h1 className="mt-1 text-3xl font-semibold">Launch readiness</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Code completion is not permission to use live data. Production becomes approved only when required deployment, access, integration, recovery, privacy, training, and client checks have evidence.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Rocket} label="Required checks" value={workspace.summary.required_total} />
        <Metric icon={CheckCircle2} label="Passed" value={workspace.summary.required_passed} />
        <Metric icon={AlertTriangle} label="Pending" value={workspace.summary.required_pending} />
        <Metric icon={KeyRound} label="Server settings present" value={`${configuredCount}/${workspace.configuration.length}`} />
      </div>

      <Card className={workspace.summary.production_approved ? "border-emerald-300" : "border-amber-300"}>
        <CardContent className="flex gap-4 pt-5">
          {workspace.summary.production_approved ? <ShieldCheck className="size-6 text-emerald-700" /> : <AlertTriangle className="size-6 text-amber-700" />}
          <div><p className="font-semibold">{workspace.summary.production_approved ? "Production acceptance complete" : "Production remains blocked"}</p><p className="mt-1 text-sm text-muted-foreground">{workspace.summary.required_waived ? `${workspace.summary.required_waived} required checks are waived, so production is not fully approved.` : "Every required item must pass with evidence. Waivers remain visible and do not count as full approval."}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Cloud className="size-5 text-primary" />Environment configuration</CardTitle><CardDescription>Only presence is shown; secret values never enter the interface.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
          {workspace.configuration.map((item) => <div className="flex items-center justify-between rounded-lg border p-3" key={item.name}><code className="text-xs">{item.name}</code><Badge variant={item.configured ? "default" : "outline"}>{item.configured ? "Present" : "Missing"}</Badge></div>)}
        </CardContent>
      </Card>

      {[...grouped.entries()].map(([category, checks]) => (
        <Card key={category}>
          <CardHeader className="border-b"><CardTitle>{categoryLabels[category] ?? category}</CardTitle><CardDescription>{checks.filter((check) => check.status === "passed").length} of {checks.length} passed</CardDescription></CardHeader>
          <CardContent className="divide-y p-0">
            {checks.map((check) => (
              <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(20rem,.75fr)]" key={check.id}>
                <div><p className="font-medium">{check.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{check.description}</p>{check.evidence ? <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-5">{check.evidence}</p> : null}</div>
                <Badge className="w-fit" variant={check.status === "passed" ? "default" : "outline"}>{check.status}</Badge>
                {workspace.user.role === "administrator" ? <LaunchCheckForm checkKey={check.check_key} currentEvidence={check.evidence} currentStatus={check.status} /> : <p className="text-sm text-muted-foreground">Administrator review required.</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {workspace.user.role === "administrator" ? (
        <Card>
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><DatabaseBackup className="size-5 text-primary" />Backup and restore evidence</CardTitle><CardDescription>Record only non-secret identifiers and SHA-256 checksums after using the documented backup scripts and isolated restore drill.</CardDescription></CardHeader>
          <CardContent className="space-y-6 pt-5">
            <BackupVerificationForm />
            {workspace.backups?.length ? <div className="divide-y border-t">{workspace.backups.map((backup) => <div className="grid gap-2 py-3 text-sm md:grid-cols-[8rem_8rem_8rem_minmax(0,1fr)]" key={backup.id}><Badge variant={backup.status === "passed" ? "default" : "outline"}>{backup.status}</Badge><span>{backup.environment}</span><span>{backup.scope}</span><span className="text-muted-foreground">{backup.notes}</span></div>)}</div> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Rocket; label: string; value: number | string }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
}
