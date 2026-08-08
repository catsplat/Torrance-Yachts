import { AlertTriangle, ArrowLeft, Calculator } from "lucide-react"
import Link from "next/link"

import { OfferDraftForm } from "@/components/offers/offer-draft-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { bulletList, renderOfferTemplate, type OfferTemplateValues } from "@/lib/offers/template"
import { calculateCharterDays, calculateCharterFee, formatCommercialNumber } from "@/lib/offers/pricing"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type NewOfferPageProps = { searchParams: Promise<{ enquiry?: string; rate?: string; from?: string }> }
const offerEligibleStates = ["new", "waiting_for_reply", "offer_sent", "negotiating"] as const

export default async function NewOfferPage({ searchParams }: NewOfferPageProps) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: eligibleEnquiries } = await supabase.from("enquiries").select(`
    id, reference, summary, status, requested_yacht_id,
    yacht:yachts!enquiries_requested_yacht_id_fkey(name)
  `).in("status", offerEligibleStates).not("requested_yacht_id", "is", null).order("updated_at", { ascending: false })

  if (!query.enquiry) return <div className="mx-auto max-w-4xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/offers"><ArrowLeft className="size-4" aria-hidden="true" />Back to offers</Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Prepare an offer</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Select an enquiry</h1><p className="mt-2 text-sm text-muted-foreground">Only enquiries with a requested yacht and an offer-compatible lifecycle state are shown.</p></div><Card><CardContent className="p-0">{eligibleEnquiries?.length ? <div className="divide-y">{eligibleEnquiries.map((enquiry) => <Link className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/40" href={`/offers/new?enquiry=${enquiry.id}`} key={enquiry.id}><div><p className="font-medium">{enquiry.reference}</p><p className="mt-1 text-sm text-muted-foreground">{enquiry.summary}</p></div><Badge variant="outline">{enquiry.yacht?.name ?? "No yacht"}</Badge></Link>)}</div> : <p className="px-5 py-12 text-center text-sm text-muted-foreground">No eligible enquiries.</p>}</CardContent></Card></div>

  const { data: enquiry } = await supabase.from("enquiries").select(`
    *,
    customer:contacts!enquiries_customer_contact_id_fkey(full_name),
    broker:contacts!enquiries_broker_contact_id_fkey(full_name),
    yacht:yachts!enquiries_requested_yacht_id_fkey(*)
  `).eq("id", query.enquiry).in("status", offerEligibleStates).single()

  if (!enquiry?.yacht || !enquiry.charter_start_date || !enquiry.charter_end_date) {
    return <MissingSetup title="Enquiry details are incomplete" body="Add a requested yacht and valid charter dates before preparing an offer." href={enquiry ? `/enquiries/${enquiry.id}` : "/enquiries"} linkLabel="Review enquiry" />
  }

  const [{ data: profile }, { data: template }, { data: rates }, { data: materials }, { data: sourceOffer }] = await Promise.all([
    supabase.from("yacht_commercial_profiles").select("*").eq("yacht_id", enquiry.yacht.id).maybeSingle(),
    supabase.from("yacht_offer_templates").select("*").eq("yacht_id", enquiry.yacht.id).eq("status", "approved").maybeSingle(),
    supabase.from("yacht_rate_periods").select("*").eq("yacht_id", enquiry.yacht.id).eq("active", true).lte("valid_from", enquiry.charter_start_date).gte("valid_to", enquiry.charter_end_date).order("valid_from"),
    supabase.from("yacht_sales_materials").select("label, public_url").eq("yacht_id", enquiry.yacht.id).eq("active", true).eq("approved_for_offers", true).order("sort_order"),
    query.from ? supabase.from("offers").select("*").eq("id", query.from).eq("enquiry_id", enquiry.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  if (!profile || !template || !rates?.length) {
    const missing = [!profile && "commercial profile", !template && "approved template", !rates?.length && "rate covering the complete charter"].filter(Boolean).join(", ")
    return <MissingSetup title="Commercial setup required" body={`${enquiry.yacht.name} needs: ${missing}.`} href={`/yachts/${enquiry.yacht.id}/commercial`} linkLabel="Configure yacht commercial data" />
  }

  const selectedRate = rates.find((rate) => rate.id === query.rate) ?? rates[0]
  const days = calculateCharterDays(enquiry.charter_start_date, enquiry.charter_end_date)
  const suggestedFee = calculateCharterFee(selectedRate.weekly_rate, days, profile.short_charter_divisor)
  const specifications = [
    enquiry.yacht.builder && `Builder: ${enquiry.yacht.builder}`,
    enquiry.yacht.year_built && `Year: ${enquiry.yacht.year_built}`,
    enquiry.yacht.length_metres && `Length: ${enquiry.yacht.length_metres} m`,
    enquiry.yacht.beam_metres && `Beam: ${enquiry.yacht.beam_metres} m`,
    enquiry.yacht.guest_capacity && `Guests: ${enquiry.yacht.guest_capacity}`,
    enquiry.yacht.cabin_count && `Cabins: ${enquiry.yacht.cabin_count}`,
    enquiry.yacht.crew_count && `Crew: ${enquiry.yacht.crew_count}`,
    enquiry.yacht.cruise_speed_knots && `Cruise speed: ${enquiry.yacht.cruise_speed_knots} knots`,
  ].filter((value): value is string => Boolean(value))
  const values: OfferTemplateValues = {
    customer_name: enquiry.broker?.full_name ?? enquiry.customer?.full_name ?? "there",
    yacht_name: enquiry.yacht.name,
    weekly_rate: formatCommercialNumber(selectedRate.weekly_rate),
    proposed_charter_fee: formatCommercialNumber(suggestedFee),
    currency: selectedRate.currency,
    tax_rate: String(selectedRate.tax_rate),
    charter_start_date: enquiry.charter_start_date,
    charter_end_date: enquiry.charter_end_date,
    guest_count: enquiry.guest_count?.toString() ?? "Not recorded",
    embarkation_port: enquiry.embarkation_port ?? "To be agreed",
    disembarkation_port: enquiry.disembarkation_port ?? "To be agreed",
    port_guidance: profile.port_guidance ?? "Port arrangements are subject to review.",
    yacht_overview: profile.overview,
    yacht_specifications: bulletList(specifications),
    key_features: bulletList(profile.key_features),
    sales_materials: bulletList(materials?.map((material) => `${material.label}: ${material.public_url}`) ?? []),
    references: profile.reference_notes ?? "Available on request.",
  }
  const renderedSubject = renderOfferTemplate(template.subject_template, values)
  const renderedBody = renderOfferTemplate(template.body_template, values)
  const proposedFee = suggestedFee

  return <div className="mx-auto max-w-5xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/offers"><ArrowLeft className="size-4" aria-hidden="true" />Back to offers</Link><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Prepare offer for {enquiry.reference}</h1><p className="mt-2 text-sm text-muted-foreground">{enquiry.yacht.name} · {enquiry.charter_start_date} to {enquiry.charter_end_date} · {days} charter days</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary">Template v{template.version_number}</Badge><Badge variant="outline">{selectedRate.name}</Badge></div></div>

    {rates.length > 1 ? <Card><CardContent className="pt-4"><form className="flex flex-wrap items-end gap-3" method="get"><input name="enquiry" type="hidden" value={enquiry.id} />{query.from ? <input name="from" type="hidden" value={query.from} /> : null}<label className="min-w-72 flex-1 space-y-1.5 text-xs font-medium">Rate period<select className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={selectedRate.id} name="rate">{rates.map((rate) => <option key={rate.id} value={rate.id}>{rate.name} — {formatCommercialNumber(rate.weekly_rate)} {rate.currency}</option>)}</select></label><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Rebuild suggestion</button></form></CardContent></Card> : null}

    <Card><CardHeader className="border-b"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Calculator className="size-4" aria-hidden="true" /></div><div><CardTitle>Commercial terms</CardTitle><CardDescription className="mt-1">Suggested from {selectedRate.name}. Editing the amount marks the snapshot as manually adjusted; verify the amount shown in the body as well.</CardDescription></div></div></CardHeader><CardContent className="grid gap-4 pt-5 sm:grid-cols-3"><Term label="Weekly rate" value={`${formatCommercialNumber(selectedRate.weekly_rate)} ${selectedRate.currency}`} /><Term label="Suggested charter fee" value={`${formatCommercialNumber(suggestedFee)} ${selectedRate.currency}`} /><Term label="Tax" value={`${selectedRate.tax_rate}%`} /></CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle>Offer draft</CardTitle></CardHeader><CardContent className="pt-5"><OfferDraftForm values={{ enquiryId: enquiry.id, templateVersionId: template.id, ratePeriodId: selectedRate.id, sourceOfferId: sourceOffer?.id, recipientName: enquiry.broker?.full_name ?? enquiry.customer?.full_name ?? "Broker", subject: renderedSubject, body: renderedBody, proposedCharterFee: proposedFee, currency: selectedRate.currency }} /></CardContent></Card>
  </div>
}

function MissingSetup({ title, body, href, linkLabel }: { title: string; body: string; href: string; linkLabel: string }) { return <div className="mx-auto max-w-3xl py-12"><Card><CardContent className="flex flex-col items-center px-6 py-12 text-center"><AlertTriangle className="size-10 text-amber-600" aria-hidden="true" /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{body}</p><Link className={cn(buttonVariants(), "mt-5")} href={href}>{linkLabel}</Link></CardContent></Card></div> }
function Term({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
