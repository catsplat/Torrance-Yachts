import { Beaker, BrainCircuit, CalendarDays, FileCheck2, Mail, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { OfflineRehearsalForm } from "@/components/rehearsal/offline-rehearsal-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getAiConfigurationSummary } from "@/lib/ai/config"
import { offlineRehearsalEnabled } from "@/lib/rehearsal/offline-email"
import { createClient } from "@/lib/supabase/server"

export default async function OfflineRehearsalPage() {
  if (!offlineRehearsalEnabled()) notFound()
  const supabase = await createClient()
  const [user, ai] = await Promise.all([getCurrentUser(), Promise.resolve(getAiConfigurationSummary())])
  const enabled = true
  const administrator = user?.role === "administrator"
  const { data: activeRuns } = administrator
    ? await supabase.from("rehearsal_runs").select("id,label,created_at").eq("status", "active").order("created_at", { ascending: false })
    : { data: [] }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Local assurance</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offline workflow rehearsal</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Exercise the genuine inbox, AI review, enquiry, offer, booking, task, and audit paths using clearly fictional records before connecting any external account.
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Beaker className="size-5 text-primary" />Start a synthetic inbound-email run</CardTitle>
          <CardDescription>Development-only. The test stops at the same human-review boundaries used in production.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {administrator ? <OfflineRehearsalForm activeRuns={activeRuns ?? []} enabled={enabled} /> : <p className="text-sm text-muted-foreground">Only an administrator may create development rehearsal records.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex gap-3 pt-5"><Mail className="mt-0.5 size-5 text-primary" /><div><p className="font-medium">Same ingestion boundary</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The fixture passes the production Gmail payload validation and invokes the same database ingestion command. It has unique fictional provider IDs for safe retry testing.</p></div></CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-3 pt-5"><BrainCircuit className="mt-0.5 size-5 text-primary" /><div><p className="font-medium">Current local AI</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{ai.provider} · {ai.model}. Output is schema-validated and remains a proposal until staff review it.</p></div></CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-3 pt-5"><ShieldCheck className="mt-0.5 size-5 text-primary" /><div><p className="font-medium">No external side effects</p><p className="mt-1 text-sm leading-6 text-muted-foreground">No Gmail, Telegram, Calendar, Drive, Sheets, or Yachtfolio call is made. Any later simulated delivery uses the local development adapter only.</p></div></CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5"><p className="font-medium">Runbook after inbox review</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground"><li>Review/correct the AI proposal.</li><li>Create and progress the synthetic enquiry.</li><li>Prepare and record a synthetic offer.</li><li>Confirm a reviewed synthetic booking.</li><li>Inspect generated tasks, payments, availability, notifications, calendar, and audit history.</li></ol></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Fictional charter rehearsal map</CardTitle>
          <CardDescription>These routes use only the seeded M/Y Asteria demonstration data. Follow the list in order; every consequential transition still needs a human reason and approval.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-3">
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/enquiries/70000000-0000-4000-8000-000000000001"><p className="font-medium">1. Enquiry and offer</p><p className="mt-1 text-sm text-muted-foreground">Start with the clearly fictional family-charter enquiry, then prepare and approve a proposal.</p></Link>
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/bookings/new"><p className="font-medium">2. Confirm booking</p><p className="mt-1 text-sm text-muted-foreground">Use only a reviewed synthetic offer; observe the 24-hour availability buffer.</p></Link>
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/bookings/availability"><p className="font-medium">3. Conflict and amendment</p><p className="mt-1 text-sm text-muted-foreground">Check overlapping buffered dates before confirming or amending the fictional booking.</p></Link>
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/documents"><FileCheck2 className="size-4 text-primary" /><p className="mt-2 font-medium">4. Documents and review</p><p className="mt-1 text-sm text-muted-foreground">Use fictional files only; test rejection, verification, requirements, and signed URLs.</p></Link>
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/tasks"><p className="font-medium">5. Tasks 0.A-7</p><p className="mt-1 text-sm text-muted-foreground">Verify dependencies, payment reminders, Captain contact draft, Yachtfolio task, and follow-up.</p></Link>
          <Link className="rounded-lg border p-4 transition-colors hover:bg-muted/40" href="/calendar"><CalendarDays className="size-4 text-primary" /><p className="mt-2 font-medium">6. Completion and audit</p><p className="mt-1 text-sm text-muted-foreground">Review charter dates, notifications, delivery outcomes, and the complete audit trail.</p></Link>
        </CardContent>
      </Card>
    </div>
  )
}
