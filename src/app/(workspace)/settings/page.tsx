import {
  Beaker,
  BellRing,
  CircleGauge,
  Clock3,
  FilePenLine,
  FileText,
  GraduationCap,
  PlugZap,
  Rocket,
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace settings</p>
        <h1 className="mt-1 text-3xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Start with your own alert delivery. Company workflow and provider controls are grouped below for administrators, not mixed into daily settings.</p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.025]">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BellRing className="size-5" /></div><div><p className="font-medium">Your alerts and connections</p><p className="mt-1 text-sm text-muted-foreground">Choose your phone, Telegram delivery, Google inbox, and the events that need your attention.</p></div></div>
          <Link className="text-sm font-medium text-primary hover:underline" href="/settings/alerts">Open personal setup</Link>
        </CardContent>
      </Card>

      {user?.role === "administrator" ? <>
        <section className="space-y-3">
          <div><h2 className="text-lg font-semibold">Workspace workflow</h2><p className="mt-1 text-sm text-muted-foreground">The operational content and people that make the charter workflow work.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingsLink description="Invite staff, manage roles, and maintain their operational contact routes." href="/settings/users" icon={UsersRound} title="Internal users" />
            <SettingsLink description="Maintain versioned KYC, captain-contact, and broker follow-up wording." href="/settings/communications" icon={FilePenLine} title="Communication templates" />
            <SettingsLink description="Manage protected, versioned issuer and payment instructions." href="/settings/invoices" icon={FileText} title="Invoice profiles" />
          </div>
        </section>

        <section className="space-y-3">
          <div><h2 className="text-lg font-semibold">System delivery and launch</h2><p className="mt-1 text-sm text-muted-foreground">Technical controls are deliberately separated from the day-to-day delivery centre.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingsLink description="Configure company provider adapters and the local automation worker." href="/settings/integrations" icon={PlugZap} title="Company connections" />
            <SettingsLink description="Verify Gmail, Telegram, n8n, AI, and the manual Yachtfolio boundary." href="/settings/activation" icon={CircleGauge} title="Integration readiness" />
            <SettingsLink description="Run fictional workflow data through the local review boundary without contacting providers." href="/settings/rehearsal" icon={Beaker} title="Offline rehearsal" />
            <SettingsLink description="Review access, recovery, privacy, training, and the client sign-off gate." href="/settings/launch" icon={Rocket} title="Launch readiness" />
            <SettingsLink description="Practice the enquiry-to-follow-up workflow using only isolated sample records." href="/tutorial" icon={GraduationCap} title="Guided tutorial" />
          </div>
        </section>

        {settings ? <Card>
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" />Enquiry housekeeping</CardTitle><CardDescription>Archive inactive pre-contract requests without deleting their history. Any new email, note, or lifecycle change resets the inactivity clock.</CardDescription></CardHeader>
          <CardContent className="space-y-5 pt-5"><OperationalSettingsForm settings={settings} /><div className="border-t pt-5"><TimeoutSweepForm /></div></CardContent>
        </Card> : null}
      </> : <Card>
        <CardHeader><CardTitle>Company settings</CardTitle><CardDescription>Workflow templates, staff access, integration activation, and release controls are managed by an administrator.</CardDescription></CardHeader>
      </Card>}
    </div>
  )
}
