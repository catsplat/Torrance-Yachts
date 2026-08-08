import { ArrowLeft, CheckCircle2, Clock3, History, LockKeyhole, MailCheck, RotateCcw } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { OfferDraftForm } from "@/components/offers/offer-draft-form"
import { OfferTransitionForm } from "@/components/offers/offer-transition-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { offerStatusLabels, pricingBasisLabels } from "@/lib/offers/options"
import { formatCommercialNumber } from "@/lib/offers/pricing"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type OfferDetailPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }

export default async function OfferDetailPage({ params, searchParams }: OfferDetailPageProps) {
  const { id } = await params
  const notices = await searchParams
  const supabase = await createClient()
  const { data: offer } = await supabase.from("offers").select(`
    *,
    enquiry:enquiries!offers_enquiry_id_fkey(id, reference, summary, status),
    yacht:yachts!offers_yacht_id_fkey(id, name),
    template:yacht_offer_templates!offers_template_version_id_fkey(name, version_number),
    rate:yacht_rate_periods!offers_rate_period_id_fkey(name)
  `).eq("id", id).single()
  if (!offer) notFound()

  const [{ data: history }, { count: eventCount }] = await Promise.all([
    supabase.from("offer_status_history").select(`
      *, actor:profiles!offer_status_history_changed_by_fkey(display_name)
    `).eq("offer_id", id).order("created_at", { ascending: false }),
    supabase.from("workflow_events").select("id", { count: "exact", head: true }).eq("aggregate_type", "offer").eq("aggregate_id", id),
  ])

  return <div className="mx-auto max-w-6xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/offers"><ArrowLeft className="size-4" aria-hidden="true" />Back to offers</Link>{offer.status === "draft" && (notices.created || notices.updated) ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="size-4" aria-hidden="true" />{notices.created ? "Reviewable offer draft created." : "Draft changes saved."}</div> : null}
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{offer.reference} · version {offer.version_number}</p><Badge variant={offer.status === "approved" || offer.status === "sent" ? "default" : "outline"}>{offerStatusLabels[offer.status]}</Badge></div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{offer.subject_snapshot}</h1><p className="mt-2 text-sm text-muted-foreground"><Link className="hover:text-foreground" href={`/enquiries/${offer.enquiry.id}`}>{offer.enquiry.reference}</Link> · {offer.yacht.name} · {offer.recipient_name}</p></div><div className="flex flex-wrap gap-2">{offer.status === "sent" ? <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/offers/new?enquiry=${offer.enquiry.id}&from=${offer.id}`}><RotateCcw aria-hidden="true" />Create revised offer</Link> : null}<div className="flex items-center gap-2 text-xs text-muted-foreground"><History className="size-4" aria-hidden="true" />{eventCount ?? 0} workflow events</div></div></div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-5"><Card><CardHeader className="border-b"><CardTitle>Commercial terms</CardTitle></CardHeader><CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3"><Term label="Charter dates" value={`${offer.charter_start_date} to ${offer.charter_end_date}`} /><Term label="Weekly rate" value={`${formatCommercialNumber(offer.weekly_rate_snapshot)} ${offer.currency}`} /><Term label="Proposed fee" value={`${formatCommercialNumber(offer.proposed_charter_fee)} ${offer.currency}`} /><Term label="Tax" value={`${offer.tax_rate_snapshot}%`} /><Term label="Pricing basis" value={pricingBasisLabels[offer.pricing_basis]} /><Term label="Source" value={`${offer.rate?.name ?? "Historical rate"} · template v${offer.template.version_number}`} /></CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle>{offer.status === "draft" ? "Offer draft" : "Offer content"}</CardTitle>{offer.status === "draft" ? <CardDescription>Review before approval.</CardDescription> : null}</CardHeader><CardContent className="pt-5">{offer.status === "draft" ? <OfferDraftForm offerId={offer.id} values={{ enquiryId: offer.enquiry_id, templateVersionId: offer.template_version_id, ratePeriodId: offer.rate_period_id ?? "", sourceOfferId: offer.source_offer_id, recipientName: offer.recipient_name, subject: offer.subject_snapshot, body: offer.body_snapshot, proposedCharterFee: offer.proposed_charter_fee, currency: offer.currency }} /> : <div><div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm"><LockKeyhole className="size-4 text-primary" aria-hidden="true" />{offerStatusLabels[offer.status]}</div><pre className="mt-4 whitespace-pre-wrap rounded-xl border bg-muted/20 p-5 font-mono text-sm leading-6">{offer.body_snapshot}</pre></div>}</CardContent></Card></div>

      <div className="space-y-5">{offer.status === "draft" ? <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" />Approve offer</CardTitle></CardHeader><CardContent className="pt-4"><OfferTransitionForm mode="approve" offerId={offer.id} /></CardContent></Card> : null}{offer.status === "approved" ? <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><MailCheck className="size-4 text-primary" aria-hidden="true" />Mark as sent</CardTitle></CardHeader><CardContent className="pt-4"><OfferTransitionForm mode="sent" offerId={offer.id} /></CardContent></Card> : null}
        <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-primary" aria-hidden="true" />History</CardTitle></CardHeader><CardContent className="p-0">{history?.map((entry) => <div className="border-b px-4 py-3 last:border-b-0" key={entry.id}><div className="flex items-center justify-between gap-2"><Badge variant="outline">{offerStatusLabels[entry.to_status]}</Badge><span className="text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleString("en-GB")}</span></div><p className="mt-2 text-xs leading-5">{entry.reason}</p><p className="mt-1 text-[11px] text-muted-foreground">{entry.actor?.display_name ?? "System"}</p></div>)}</CardContent></Card>
      </div></div>
  </div>
}

function Term({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }
