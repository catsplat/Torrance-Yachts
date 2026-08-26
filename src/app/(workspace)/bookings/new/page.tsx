import { AlertTriangle, ArrowLeft, FileSignature } from "lucide-react"
import Link from "next/link"

import { BookingConfirmationForm } from "@/components/bookings/booking-confirmation-form"
import { ManualCalendarEntryForm } from "@/components/bookings/booking-confirmation-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBookingMoney } from "@/lib/bookings/options"
import { bufferedReservationDates } from "@/lib/bookings/validation"
import { createClient } from "@/lib/supabase/server"

type Props = { searchParams: Promise<{ enquiry?: string; offer?: string }> }

export default async function NewBookingPage({ searchParams }: Props) {
  const query = await searchParams
  const supabase = await createClient()
  if (query.enquiry === "manual") {
    const [{ data: yachts }, { data: contacts }, { data: companies }] = await Promise.all([
      supabase.from("yachts").select("id,name").eq("status", "active").order("name"),
      supabase.from("contacts").select("id,full_name").eq("active", true).order("full_name"),
      supabase.from("companies").select("id,name").eq("active", true).order("name"),
    ])
    return <div className="mx-auto max-w-6xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/bookings"><ArrowLeft className="size-4" />Back to bookings</Link><div><h1 className="text-3xl font-semibold">New calendar entry</h1><p className="mt-2 text-sm text-muted-foreground">Choose a confirmed charter or a simple operational availability hold.</p></div><ManualCalendarEntryForm companies={companies?.map((company) => ({ id: company.id, name: company.name })) ?? []} contacts={contacts?.map((contact) => ({ id: contact.id, name: contact.full_name })) ?? []} yachts={yachts ?? []} /></div>
  }
  if (!query.enquiry) {
    const { data: enquiries } = await supabase.from("enquiries").select(`id,reference,summary,requested_yacht_id,yacht:yachts!enquiries_requested_yacht_id_fkey(name),offers!offers_enquiry_id_fkey(id,reference,status,version_number)`).eq("status", "awaiting_signatures").order("updated_at", { ascending: false })
    const eligible = enquiries?.map((enquiry) => ({ ...enquiry, sentOffers: enquiry.offers.filter((offer) => offer.status === "sent") })).filter((enquiry) => enquiry.requested_yacht_id && enquiry.sentOffers.length) ?? []
    return <div className="mx-auto max-w-4xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/bookings"><ArrowLeft className="size-4" />Back to bookings</Link><div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">Select an enquiry</h1><p className="mt-2 text-sm text-muted-foreground">Ready for booking confirmation.</p></div><Link className="rounded-md border px-3 py-2 text-sm font-medium" href="/bookings/new?enquiry=manual">New calendar entry</Link></div><Card><CardContent className="p-0">{eligible.length ? <div className="divide-y">{eligible.map((enquiry) => <Link className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/40" href={`/bookings/new?enquiry=${enquiry.id}&offer=${enquiry.sentOffers[0].id}`} key={enquiry.id}><div><p className="font-medium">{enquiry.reference}</p><p className="mt-1 text-sm text-muted-foreground">{enquiry.summary}</p></div><Badge variant="outline">{enquiry.yacht?.name}</Badge></Link>)}</div> : <p className="px-5 py-12 text-center text-sm text-muted-foreground">No enquiries are ready for booking.</p>}</CardContent></Card></div>
  }

  const { data: enquiry } = await supabase.from("enquiries").select(`*,yacht:yachts!enquiries_requested_yacht_id_fkey(id,name),offers!offers_enquiry_id_fkey(*)`).eq("id", query.enquiry).eq("status", "awaiting_signatures").single()
  const sentOffers = enquiry?.offers.filter((offer) => offer.status === "sent") ?? []
  const offer = sentOffers.find((item) => item.id === query.offer) ?? sentOffers.at(-1)
  if (!enquiry?.yacht || !offer) return <div className="mx-auto max-w-3xl py-12"><Card><CardContent className="py-12 text-center"><AlertTriangle className="mx-auto size-10 text-amber-600" /><h1 className="mt-4 text-xl font-semibold">Booking prerequisites not met</h1><p className="mt-2 text-sm text-muted-foreground">The enquiry must be awaiting signatures and have a sent offer for its yacht.</p></CardContent></Card></div>
  const startDate = offer.charter_start_date
  const endDate = offer.charter_end_date
  const buffer = bufferedReservationDates(startDate, endDate)
  const { data: availability } = await supabase.rpc("check_yacht_availability", { p_yacht_id: enquiry.yacht.id, p_charter_start_date: startDate, p_charter_end_date: endDate, p_exclude_booking_id: undefined })
  const conflict = availability?.[0]

  return <div className="mx-auto max-w-5xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/bookings"><ArrowLeft className="size-4" />Back to bookings</Link><div><h1 className="text-3xl font-semibold">Confirm booking for {enquiry.reference}</h1><p className="mt-2 text-sm text-muted-foreground">{offer.reference} · {enquiry.yacht.name} · {formatBookingMoney(offer.proposed_charter_fee, offer.currency)}</p></div>
    <Card className={conflict?.available ? "border-emerald-200" : "border-destructive/40"}><CardHeader><CardTitle>{conflict?.available ? "Buffered dates are currently available" : "Availability conflict detected"}</CardTitle><CardDescription>{conflict?.available ? `The yacht will be reserved from ${buffer.reservedFrom} through ${buffer.reservedThrough}. Availability is rechecked atomically on confirmation.` : `Conflicts with ${conflict?.conflicting_reference} (${conflict?.reserved_from} through ${conflict?.reserved_through}). Confirmation will be rejected.`}</CardDescription></CardHeader></Card>
    <Card><CardHeader className="border-b"><div className="flex items-start gap-3"><FileSignature className="mt-0.5 size-5 text-primary" /><div><CardTitle>Review contract-derived facts</CardTitle><CardDescription className="mt-1">Values begin with the locked sent offer but must be compared with the fully signed agreement.</CardDescription></div></div></CardHeader><CardContent className="pt-5"><BookingConfirmationForm values={{ enquiryId: enquiry.id, offerId: offer.id, yachtId: enquiry.yacht.id, yachtName: enquiry.yacht.name, startDate, endDate, embarkationPort: enquiry.embarkation_port, disembarkationPort: enquiry.disembarkation_port, guestCount: enquiry.guest_count, charterFee: offer.proposed_charter_fee, currency: offer.currency, taxRate: offer.tax_rate_snapshot }} /></CardContent></Card>
  </div>
}
