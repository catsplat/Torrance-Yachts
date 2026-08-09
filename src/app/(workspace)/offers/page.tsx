import { CheckCircle2, Clock3, FileText, Plus, Search, Ship } from "lucide-react"
import Link from "next/link"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getOfferRegisterPage } from "@/lib/offers/data"
import { offerStatusLabels, pricingBasisLabels } from "@/lib/offers/options"
import { formatCommercialNumber } from "@/lib/offers/pricing"
import { offerStatusValues } from "@/lib/offers/validation"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Enums } from "@/types/database"

type OffersPageProps = { searchParams: Promise<{ cursor?: string; q?: string; status?: string; yacht?: string }> }

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const filters = await searchParams
  const supabase = await createClient()
  const search = filters.q?.trim().slice(0, 160) ?? ""
  const selectedStatus = offerStatusValues.includes(filters.status as Enums<"offer_status">)
    ? (filters.status as Enums<"offer_status">)
    : undefined
  const yachtId = z.uuid().safeParse(filters.yacht).success ? filters.yacht : undefined
  const [offerRegister, { data: yachts, error: yachtsError }] = await Promise.all([
    getOfferRegisterPage({
      cursor: filters.cursor,
      query: search,
      status: selectedStatus,
      yachtId,
    }),
    supabase.from("yachts").select("id, name").order("name"),
  ])
  if (yachtsError) throw new Error("Unable to load offers.")

  const visibleOffers = offerRegister.offers

  const awaitingApproval = visibleOffers.filter((offer) => offer.status === "draft").length
  const approvedNotSent = visibleOffers.filter((offer) => offer.status === "approved").length

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Offers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Prepare, approve and record yacht offers.</p></div><Link className={cn(buttonVariants())} data-tutorial-anchor="offer-create" href="/offers/new"><Plus aria-hidden="true" />Prepare offer</Link></div>

    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={FileText} label="Matching offers" value={offerRegister.totalCount} /><Metric icon={Clock3} label="Awaiting approval on page" value={awaitingApproval} /><Metric icon={CheckCircle2} label="Approved on page" value={approvedNotSent} /></div>

    <Card><CardHeader className="border-b"><CardTitle>All offers</CardTitle><CardDescription>Current and sent versions.</CardDescription></CardHeader><CardContent className="pt-5"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem_auto]" method="get"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><input aria-label="Search offers" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={filters.q} name="q" placeholder="Reference, recipient, enquiry or yacht" /></label><select aria-label="Filter offers by status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={selectedStatus ?? ""} name="status"><option value="">All states</option>{offerStatusValues.map((status) => <option key={status} value={status}>{offerStatusLabels[status]}</option>)}</select><select aria-label="Filter offers by yacht" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={yachtId ?? ""} name="yacht"><option value="">All yachts</option>{yachts?.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply filters</button></form></CardContent></Card>

    <Card><CardContent className="p-0">{visibleOffers.length ? <div className="divide-y">{visibleOffers.map((offer) => <Link className="block px-5 py-4 transition-colors hover:bg-muted/40" href={`/offers/${offer.id}`} key={offer.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{offer.reference} · v{offer.version_number}</p><Badge variant={offer.status === "sent" || offer.status === "approved" ? "default" : "outline"}>{offerStatusLabels[offer.status]}</Badge>{offer.pricing_basis === "manually_adjusted" ? <Badge variant="secondary">Adjusted terms</Badge> : null}</div><p className="mt-1 text-sm">{offer.subject_snapshot}</p><p className="mt-1 text-xs text-muted-foreground">{offer.enquiry_reference} · {offer.recipient_name} · {offer.yacht_name}</p></div><div className="text-right"><p className="font-medium">{formatCommercialNumber(offer.proposed_charter_fee)} {offer.currency}</p><p className="mt-1 text-xs text-muted-foreground">{pricingBasisLabels[offer.pricing_basis]}</p></div></div></Link>)}</div> : <div className="px-5 py-14 text-center"><Ship className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" /><p className="mt-3 font-medium">No matching offers</p><p className="mt-1 text-sm text-muted-foreground">Prepare an offer from an enquiry with a configured yacht.</p></div>}<CursorPagination currentCount={visibleOffers.length} nextCursor={offerRegister.nextCursor} pathname="/offers" searchParams={{ cursor: filters.cursor, q: search, status: selectedStatus, yacht: yachtId }} totalCount={offerRegister.totalCount} /></CardContent></Card>
  </div>
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" aria-hidden="true" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
}
