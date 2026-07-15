import { CheckCircle2, Clock3, FileText, Plus, Search, Ship } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { offerStatusLabels, pricingBasisLabels } from "@/lib/offers/options"
import { formatCommercialNumber } from "@/lib/offers/pricing"
import { offerStatusValues } from "@/lib/offers/validation"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type OffersPageProps = { searchParams: Promise<{ q?: string; status?: string; yacht?: string }> }

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const filters = await searchParams
  const supabase = await createClient()
  const [{ data: offers, error }, { data: yachts }] = await Promise.all([
    supabase.from("offers").select(`
      *,
      enquiry:enquiries!offers_enquiry_id_fkey(reference, summary),
      yacht:yachts!offers_yacht_id_fkey(id, name)
    `).order("updated_at", { ascending: false }).limit(500),
    supabase.from("yachts").select("id, name").order("name"),
  ])
  if (error) throw new Error("Unable to load offers.")

  const search = filters.q?.trim().toLocaleLowerCase("en-GB").slice(0, 160) ?? ""
  const selectedStatus = offerStatusValues.includes(filters.status as typeof offerStatusValues[number]) ? filters.status : ""
  const visibleOffers = offers.filter((offer) => {
    const matchesSearch = !search || [offer.reference, offer.subject_snapshot, offer.recipient_name, offer.enquiry.reference, offer.yacht.name].some((value) => value.toLocaleLowerCase("en-GB").includes(search))
    return matchesSearch && (!selectedStatus || offer.status === selectedStatus) && (!filters.yacht || offer.yacht_id === filters.yacht)
  })

  const awaitingApproval = visibleOffers.filter((offer) => offer.status === "draft").length
  const approvedNotSent = visibleOffers.filter((offer) => offer.status === "approved").length

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Commercial workflow</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review exact yacht-specific commercial snapshots, approve them, and record external sending without giving the application autonomous send authority.</p></div><Link className={cn(buttonVariants())} href="/offers/new"><Plus aria-hidden="true" />Prepare offer</Link></div>

    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={FileText} label="Matching offers" value={visibleOffers.length} /><Metric icon={Clock3} label="Awaiting approval" value={awaitingApproval} /><Metric icon={CheckCircle2} label="Approved, not sent" value={approvedNotSent} /></div>

    <Card><CardHeader className="border-b"><CardTitle>Offer register</CardTitle><CardDescription>Search versioned snapshots. Historical sent offers remain visible when newer versions are prepared.</CardDescription></CardHeader><CardContent className="pt-5"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem_auto]" method="get"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><input aria-label="Search offers" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={filters.q} name="q" placeholder="Reference, recipient, enquiry or yacht" /></label><select aria-label="Filter offers by status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={selectedStatus} name="status"><option value="">All states</option>{offerStatusValues.map((status) => <option key={status} value={status}>{offerStatusLabels[status]}</option>)}</select><select aria-label="Filter offers by yacht" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={filters.yacht ?? ""} name="yacht"><option value="">All yachts</option>{yachts?.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply filters</button></form></CardContent></Card>

    <Card><CardContent className="p-0">{visibleOffers.length ? <div className="divide-y">{visibleOffers.map((offer) => <Link className="block px-5 py-4 transition-colors hover:bg-muted/40" href={`/offers/${offer.id}`} key={offer.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{offer.reference} · v{offer.version_number}</p><Badge variant={offer.status === "sent" || offer.status === "approved" ? "default" : "outline"}>{offerStatusLabels[offer.status]}</Badge>{offer.pricing_basis === "manually_adjusted" ? <Badge variant="secondary">Adjusted terms</Badge> : null}</div><p className="mt-1 text-sm">{offer.subject_snapshot}</p><p className="mt-1 text-xs text-muted-foreground">{offer.enquiry.reference} · {offer.recipient_name} · {offer.yacht.name}</p></div><div className="text-right"><p className="font-medium">{formatCommercialNumber(offer.proposed_charter_fee)} {offer.currency}</p><p className="mt-1 text-xs text-muted-foreground">{pricingBasisLabels[offer.pricing_basis]}</p></div></div></Link>)}</div> : <div className="px-5 py-14 text-center"><Ship className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" /><p className="mt-3 font-medium">No matching offers</p><p className="mt-1 text-sm text-muted-foreground">Prepare an offer from an enquiry with a configured yacht.</p></div>}</CardContent></Card>
  </div>
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" aria-hidden="true" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
}
