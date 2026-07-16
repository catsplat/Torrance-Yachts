import { CalendarCheck2, CheckCircle2, Clock3, Plus, Search } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { bookingStatusLabels, bookingStatusValues, formatBookingDate } from "@/lib/bookings/options"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type Props = { searchParams: Promise<{ q?: string; status?: string; yacht?: string }> }

export default async function BookingsPage({ searchParams }: Props) {
  const filters = await searchParams
  const supabase = await createClient()
  const [{ data: bookings, error }, { data: yachts }] = await Promise.all([
    supabase.from("bookings").select(`*, yacht:yachts!bookings_yacht_id_fkey(id,name), enquiry:enquiries!bookings_enquiry_id_fkey(reference,summary), reservation:booking_reservations!booking_reservations_booking_id_fkey(reserved_from,reserved_through,active), yachtfolio:yachtfolio_booking_actions!yachtfolio_booking_actions_booking_id_fkey(status)`).order("charter_start_date").limit(500),
    supabase.from("yachts").select("id,name").order("name"),
  ])
  if (error) throw new Error("Unable to load bookings.")
  const search = filters.q?.trim().toLocaleLowerCase("en-GB").slice(0, 160) ?? ""
  const status = bookingStatusValues.includes(filters.status as typeof bookingStatusValues[number]) ? filters.status : ""
  const visible = bookings
    .filter((booking) => booking.reservation && (!search || [booking.reference, booking.yacht.name, booking.enquiry.reference, booking.enquiry.summary].some((value) => value.toLocaleLowerCase("en-GB").includes(search))) && (!status || booking.status === status) && (!filters.yacht || booking.yacht_id === filters.yacht))
    .map((booking) => ({ ...booking, reservation: booking.reservation! }))
  const activeCount = visible.filter((booking) => ["confirmed", "charter_active"].includes(booking.status)).length
  const pendingYachtfolio = visible.filter((booking) => booking.yachtfolio?.status === "pending").length

  return <div className="mx-auto max-w-6xl space-y-5" data-tutorial-anchor="booking-register">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Charter operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Bookings and availability</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Authoritative charter records, protected one-day operating buffers, and manually verified Yachtfolio work.</p></div><div className="flex gap-2"><Link className={cn(buttonVariants({ variant: "outline" }))} href="/bookings/availability"><CalendarCheck2 />Check availability</Link><Link className={cn(buttonVariants())} href="/bookings/new"><Plus />Confirm booking</Link></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={CalendarCheck2} label="Matching bookings" value={visible.length} /><Metric icon={CheckCircle2} label="Reserved or active" value={activeCount} /><Metric icon={Clock3} label="Yachtfolio pending" value={pendingYachtfolio} /></div>
    <Card><CardHeader className="border-b"><CardTitle>Booking register</CardTitle><CardDescription>Search confirmed charters and their operational status.</CardDescription></CardHeader><CardContent className="pt-5"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem_auto]" method="get"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search bookings" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={filters.q} name="q" placeholder="Reference, enquiry or yacht" /></label><select aria-label="Filter booking status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={status} name="status"><option value="">All states</option>{bookingStatusValues.map((value) => <option key={value} value={value}>{bookingStatusLabels[value]}</option>)}</select><select aria-label="Filter by yacht" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={filters.yacht ?? ""} name="yacht"><option value="">All yachts</option>{yachts?.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply</button></form></CardContent></Card>
    <Card><CardContent className="p-0">{visible.length ? <div className="divide-y">{visible.map((booking) => <Link className="block px-5 py-4 hover:bg-muted/40" href={`/bookings/${booking.id}`} key={booking.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{booking.reference}</p><Badge variant={booking.status === "cancelled" ? "outline" : "default"}>{bookingStatusLabels[booking.status]}</Badge>{booking.yachtfolio?.status === "pending" ? <Badge className="border-amber-300 bg-amber-50 text-amber-900" variant="outline">Yachtfolio pending</Badge> : null}</div><p className="mt-1 text-sm">{booking.yacht.name} · {formatBookingDate(booking.charter_start_date)} – {formatBookingDate(booking.charter_end_date)}</p><p className="mt-1 text-xs text-muted-foreground">From {booking.enquiry.reference} · Buffer {formatBookingDate(booking.reservation.reserved_from)} – {formatBookingDate(booking.reservation.reserved_through)}</p></div></div></Link>)}</div> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">No matching bookings. Confirm one from an enquiry awaiting signatures.</p>}</CardContent></Card>
  </div>
}
function Metric({ icon: Icon, label, value }: { icon: typeof CalendarCheck2; label: string; value: number }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card> }
