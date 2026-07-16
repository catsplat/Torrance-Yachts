import { BellRing, BrainCircuit, Clock3, FilePenLine, FileText, GraduationCap, MailCheck, PlugZap, Rocket, ShieldCheck, UsersRound } from "lucide-react"
import Link from "next/link"

import { OperationalSettingsForm, TimeoutSweepForm } from "@/components/emails/email-forms"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getAiSettingsSummary } from "@/lib/ai/data"
import { getOperationalSettings } from "@/lib/emails/data"

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([getOperationalSettings(), getCurrentUser()])
  const ai = getAiSettingsSummary()
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operational controls</p><h1 className="mt-1 text-3xl font-semibold">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Configure safe routing and lifecycle rules without changing application code.</p></div>
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Clock3 className="size-5" />Enquiry inactivity timeouts</CardTitle><CardDescription>Dead-end requests are archived, never deleted. New email activity, notes, or lifecycle changes reset the inactivity clock.</CardDescription></CardHeader><CardContent className="space-y-5 pt-5">{user?.role === "administrator" ? <OperationalSettingsForm settings={settings} /> : <p className="text-sm text-muted-foreground">Only an administrator can change timeout rules.</p>}<div className="border-t pt-5"><TimeoutSweepForm /></div></CardContent></Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/settings/alerts"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><BellRing className="size-5 text-primary" /><div><p className="font-medium">My alerts and connections</p><p className="mt-1 text-sm text-muted-foreground">Choose personal Telegram, email, AI summary, and event preferences.</p></div></CardContent></Card></Link>
        <Card><CardContent className="flex gap-3 pt-5"><BrainCircuit className="size-5 text-primary" /><div><p className="font-medium">AI provider</p><p className="mt-1 text-sm text-muted-foreground">{ai.provider} · {ai.model} · {ai.enabled ? "configured" : "not configured"}</p><p className="mt-2 text-xs text-muted-foreground">Provider credentials stay server-only. Outputs always require human review.</p></div></CardContent></Card>
        <Link href="/settings/communications"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><FilePenLine className="size-5 text-primary" /><div><p className="font-medium">Communication templates</p><p className="mt-1 text-sm text-muted-foreground">Version KYC, captain-contact, and broker follow-up wording.</p></div></CardContent></Card></Link>
        <Link href="/settings/invoices"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><FileText className="size-5 text-primary" /><div><p className="font-medium">Invoice profiles</p><p className="mt-1 text-sm text-muted-foreground">Protected, versioned issuer and payment instructions.</p></div></CardContent></Card></Link>
        <Link href="/integrations"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><PlugZap className="size-5 text-primary" /><div><p className="font-medium">Integrations</p><p className="mt-1 text-sm text-muted-foreground">Enable adapters, review notifications, and inspect delivery failures.</p></div></CardContent></Card></Link>
        <Link href="/tutorial"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><GraduationCap className="size-5 text-primary" /><div><p className="font-medium">Guided tutorial</p><p className="mt-1 text-sm text-muted-foreground">Practise the complete enquiry-to-follow-up workflow with isolated synthetic state.</p></div></CardContent></Card></Link>
        <Link href="/settings/launch"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><Rocket className="size-5 text-primary" /><div><p className="font-medium">Launch readiness</p><p className="mt-1 text-sm text-muted-foreground">Review hosting, access, integrations, recovery, privacy, training, and sign-off.</p></div></CardContent></Card></Link>
        <Link href="/settings/users"><Card className="h-full transition-colors hover:border-primary/40"><CardContent className="flex gap-3 pt-5"><UsersRound className="size-5 text-primary" /><div><p className="font-medium">Internal users</p><p className="mt-1 text-sm text-muted-foreground">Invite staff, manage access, contact routes, and password recovery.</p></div></CardContent></Card></Link>
      </div>
      <div className="grid gap-5 md:grid-cols-2"><Card><CardContent className="flex gap-3 pt-5"><MailCheck className="size-5 text-primary" /><div><p className="font-medium">Gmail routing boundary</p><p className="mt-1 text-sm text-muted-foreground">n8n submits validated messages and executes only durable, idempotent provider actions.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 pt-5"><ShieldCheck className="size-5 text-primary" /><div><p className="font-medium">Human approval retained</p><p className="mt-1 text-sm text-muted-foreground">External drafts and consequential notifications remain reviewable before delivery.</p></div></CardContent></Card></div>
    </div>
  )
}
