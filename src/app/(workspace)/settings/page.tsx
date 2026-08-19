import {
  Beaker,
  BellRing,
  BrainCircuit,
  CircleGauge,
  Clock3,
  ClipboardPaste,
  FilePenLine,
  FileText,
  GraduationCap,
  PlugZap,
  Rocket,
  ServerCog,
  ScrollText,
  UsersRound,
} from "lucide-react"
import Link from "next/link"

import { OperationalSettingsForm, TimeoutSweepForm } from "@/components/emails/email-forms"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getOperationalSettings } from "@/lib/emails/data"

function SettingsLink({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string
  href: string
  icon: typeof BellRing
  title: string
}) {
  return (
    <Link className="group block" href={href}>
      <div className="flex h-full gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-accent/35">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div>
        <div>
          <p className="font-medium group-hover:text-primary">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  const settings = user?.role === "administrator" ? await getOperationalSettings() : null

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/[0.025]"><CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BellRing className="size-5" /></div><div><p className="font-medium">My account and alerts</p><p className="mt-1 text-sm text-muted-foreground">Contact details, Telegram and connected mail.</p></div></div><Link className="text-sm font-medium text-primary hover:underline" href="/settings/alerts">Open</Link></CardContent></Card>
        <Card><CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><GraduationCap className="size-5" /></div><div><p className="font-medium">Tutorial</p><p className="mt-1 text-sm text-muted-foreground">Practice the workflow with isolated sample data.</p></div></div><Link className="text-sm font-medium text-primary hover:underline" href="/tutorial">Open</Link></CardContent></Card>
      </div>

      {user?.role === "administrator" ? <>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingsLink description="Staff access and roles." href="/settings/users" icon={UsersRound} title="Users" />
            <SettingsLink description="Complete the business configuration." href="/settings/readiness" icon={CircleGauge} title="Business setup" />
            <SettingsLink description="Load reviewed yachts, templates and workflow drafts." href="/settings/configuration-pack" icon={ClipboardPaste} title="Configuration pack" />
            <SettingsLink description="Search administrative and operational changes." href="/settings/audit" icon={ScrollText} title="Audit log" />
            <SettingsLink description="KYC, captain and follow-up wording." href="/settings/communications" icon={FilePenLine} title="Message templates" />
            <SettingsLink description="Booking workflow and dependencies." href="/tasks/templates" icon={Clock3} title="Task templates" />
            <SettingsLink description="Issuer and payment details." href="/settings/invoices" icon={FileText} title="Invoice profiles" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">System</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingsLink description="Gmail, Telegram and automation." href="/settings/integrations" icon={PlugZap} title="Connections" />
            <SettingsLink description="Provider, model and processing preference." href="/settings/ai" icon={BrainCircuit} title="AI" />
            <SettingsLink description="Provider connection status." href="/settings/activation" icon={CircleGauge} title="Connection status" />
            <SettingsLink description="Queues, scanner and recovery." href="/settings/operations" icon={ServerCog} title="Operations" />
          </div>
        </section>

        {process.env.APP_ENVIRONMENT !== "production" ? (
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Development and launch tools</summary>
            <div className="grid gap-3 border-t p-4 md:grid-cols-2">
              <SettingsLink description="Local workflow testing." href="/settings/rehearsal" icon={Beaker} title="Test workflow" />
              <SettingsLink description="Checks required before launch." href="/settings/launch" icon={Rocket} title="Launch checklist" />
            </div>
          </details>
        ) : null}

        {settings ? <Card>
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" />Inactive enquiries</CardTitle><CardDescription>Set when dormant enquiries leave the active list.</CardDescription></CardHeader>
          <CardContent className="space-y-5 pt-5"><OperationalSettingsForm settings={settings} /><div className="border-t pt-5"><TimeoutSweepForm /></div></CardContent>
        </Card> : null}
      </> : <Card>
        <CardHeader><CardTitle>Company settings</CardTitle><CardDescription>Managed by an administrator.</CardDescription></CardHeader>
      </Card>}
    </div>
  )
}
