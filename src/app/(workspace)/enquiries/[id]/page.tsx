import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FileText,
  History,
  MessageSquareText,
  Ship,
  UserRound,
  Workflow,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EnquiryForm } from "@/components/enquiries/enquiry-form"
import { EnquiryNoteForm } from "@/components/enquiries/enquiry-note-form"
import { EnquiryTransitionForm } from "@/components/enquiries/enquiry-transition-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getEnquiryFormOptions } from "@/lib/enquiries/form-options"
import {
  enquiryNoteKindLabels,
  enquiryPriorityLabels,
  enquiryPriorityTones,
  enquiryStatusLabels,
  enquiryStatusTones,
} from "@/lib/enquiries/options"
import { enquiryTransitionTargets } from "@/lib/enquiries/state-machine"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type EnquiryDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; updated?: string }>
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value))
}

export default async function EnquiryDetailPage({
  params,
  searchParams,
}: EnquiryDetailPageProps) {
  const { id } = await params
  const notices = await searchParams
  const supabase = await createClient()

  const [
    enquiryResult,
    notesResult,
    historyResult,
    auditResult,
    workflowResult,
    offersResult,
    bookingsResult,
    options,
  ] = await Promise.all([
    supabase
      .from("enquiries")
      .select(`
        *,
        customer:contacts!enquiries_customer_contact_id_fkey(id, full_name),
        broker:contacts!enquiries_broker_contact_id_fkey(id, full_name),
        broker_company:companies!enquiries_broker_company_id_fkey(id, name),
        yacht:yachts!enquiries_requested_yacht_id_fkey(id, name),
        owner:profiles!enquiries_owner_user_id_fkey(id, display_name)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("enquiry_notes")
      .select(
        "id, kind, body, created_at, author:profiles!enquiry_notes_created_by_fkey(id, display_name)",
      )
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("enquiry_status_history")
      .select(
        "id, from_status, to_status, reason, created_at, actor:profiles!enquiry_status_history_changed_by_fkey(id, display_name)",
      )
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "enquiry")
      .eq("entity_id", id),
    supabase
      .from("workflow_events")
      .select("id", { count: "exact", head: true })
      .eq("aggregate_type", "enquiry")
      .eq("aggregate_id", id),
    supabase
      .from("offers")
      .select("id, reference, version_number, status, proposed_charter_fee, currency, updated_at")
      .eq("enquiry_id", id)
      .order("version_number", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, reference, status")
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false }),
    getEnquiryFormOptions(),
  ])

  if (enquiryResult.error || !enquiryResult.data) notFound()
  if (notesResult.error || historyResult.error || auditResult.error || workflowResult.error || offersResult.error || bookingsResult.error) {
    throw new Error("Unable to load the enquiry history.")
  }

  const enquiry = enquiryResult.data
  const requester =
    enquiry.customer?.full_name ||
    enquiry.broker?.full_name ||
    enquiry.broker_company?.name ||
    "Requester not resolved"

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/enquiries"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to enquiries
      </Link>

      {notices.created || notices.updated ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {notices.created ? "Enquiry created and recorded." : "Enquiry details updated."}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-primary">{enquiry.reference}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{enquiry.summary}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={enquiryStatusTones[enquiry.status]} variant="outline">
                  {enquiryStatusLabels[enquiry.status]}
                </Badge>
                <Badge variant="secondary">
                  <span className={enquiryPriorityTones[enquiry.priority]}>
                    {enquiryPriorityLabels[enquiry.priority]} priority
                  </span>
                </Badge>
                <Badge variant="outline">{enquiry.source} source</Badge>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              {bookingsResult.data[0] ? (
                <Link className={cn(buttonVariants())} href={`/bookings/${bookingsResult.data[0].id}`}>
                  <CalendarDays aria-hidden="true" />Open {bookingsResult.data[0].reference}
                </Link>
              ) : enquiry.status === "awaiting_signatures" && offersResult.data.some((offer) => offer.status === "sent") ? (
                <Link className={cn(buttonVariants())} href={`/bookings/new?enquiry=${enquiry.id}`}>
                  <CheckCircle2 aria-hidden="true" />Confirm signed booking
                </Link>
              ) : null}
              {enquiry.requested_yacht_id && enquiry.charter_start_date && enquiry.charter_end_date && ["new", "waiting_for_reply", "offer_sent", "negotiating"].includes(enquiry.status) ? (
                <Link className={cn(buttonVariants())} href={`/offers/new?enquiry=${enquiry.id}`}><FileText aria-hidden="true" />Prepare offer</Link>
              ) : null}
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:text-right">
              <span className="flex items-center gap-1.5 lg:justify-end">
                <History aria-hidden="true" className="size-3.5" />
                {auditResult.count ?? 0} audited record change{auditResult.count === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5 lg:justify-end">
                <Workflow aria-hidden="true" className="size-3.5" />
                {workflowResult.count ?? 0} durable event{workflowResult.count === 1 ? "" : "s"}
              </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex gap-3">
            <UserRound aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">Primary requester</p><p className="mt-1 font-medium">{requester}</p></div>
          </div>
          <div className="flex gap-3">
            <Ship aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">Requested yacht</p><p className="mt-1 font-medium">{enquiry.yacht?.name || "Not selected"}</p></div>
          </div>
          <div className="flex gap-3">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">Charter dates</p><p className="mt-1 font-medium">{formatDate(enquiry.charter_start_date)}{enquiry.charter_end_date ? ` – ${formatDate(enquiry.charter_end_date)}` : ""}</p></div>
          </div>
          <div className="flex gap-3">
            <UserRound aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">Internal owner</p><p className="mt-1 font-medium">{enquiry.owner?.display_name || "Unassigned"}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_22rem]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Enquiry details</CardTitle>
            <CardDescription>
              Edit facts here. Operational status changes use the controlled command.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <EnquiryForm enquiry={enquiry} mode="edit" options={options} />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Workflow aria-hidden="true" className="size-4 text-primary" />
              Change operational state
            </CardTitle>
            <CardDescription>
              Status changes appear in the enquiry history.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <EnquiryTransitionForm
              currentStatus={enquiry.status}
              enquiryId={enquiry.id}
              targets={enquiryTransitionTargets[enquiry.status]}
            />
            {enquiry.status === "awaiting_signatures" ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                Use “Confirm signed booking” to reserve the yacht dates.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><FileText aria-hidden="true" className="size-4 text-primary" />Offer versions</CardTitle>
          <CardDescription>Drafts and sent versions for this enquiry.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {offersResult.data.length ? <div className="divide-y">{offersResult.data.map((offer) => <Link className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40" href={`/offers/${offer.id}`} key={offer.id}><div><p className="font-medium">{offer.reference} · version {offer.version_number}</p><p className="mt-1 text-xs text-muted-foreground">Updated {formatDateTime(offer.updated_at)}</p></div><div className="flex items-center gap-3"><p className="text-sm font-medium">{new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2 }).format(offer.proposed_charter_fee)} {offer.currency}</p><Badge variant="outline">{offer.status}</Badge></div></Link>)}</div> : <div className="px-5 py-9 text-center text-sm text-muted-foreground">No offer snapshots prepared yet.</div>}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText aria-hidden="true" className="size-4 text-primary" />
              Notes and requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <EnquiryNoteForm enquiryId={enquiry.id} />
            {notesResult.data.length ? (
              <div className="space-y-0 rounded-xl border">
                {notesResult.data.map((note, index) => (
                  <div key={note.id}>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary">{enquiryNoteKindLabels[note.kind]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{note.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {note.author?.display_name || "System fixture"}
                      </p>
                    </div>
                    {index < notesResult.data.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notes recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <History aria-hidden="true" className="size-4 text-primary" />
              Lifecycle history
            </CardTitle>
            <CardDescription>
              An immutable explanation of how the enquiry reached its current state.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-0">
              {historyResult.data.map((entry, index) => (
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3" key={entry.id}>
                  <div className="flex flex-col items-center">
                    <CircleDot aria-hidden="true" className="size-4 text-primary" />
                    {index < historyResult.data.length - 1 ? (
                      <div className="my-1 h-full min-h-14 w-px bg-border" />
                    ) : null}
                  </div>
                  <div className={cn(index < historyResult.data.length - 1 && "pb-5")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {entry.from_status
                          ? `${enquiryStatusLabels[entry.from_status]} → ${enquiryStatusLabels[entry.to_status]}`
                          : enquiryStatusLabels[entry.to_status]}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.actor?.display_name || "System fixture"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
