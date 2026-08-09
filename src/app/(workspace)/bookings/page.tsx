import { CalendarCheck2, CheckCircle2, Clock3, Plus, Search } from "lucide-react"
import Link from "next/link"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getBookingRegisterPage } from "@/lib/bookings/data"
import { bookingStatusLabels, bookingStatusValues, formatBookingDate } from "@/lib/bookings/options"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Enums } from "@/types/database"

type Props = { searchParams: Promise<{ cursor?: string; q?: string; status?: string; yacht?: string }> }

export default async function BookingsPage({ searchParams }: Props) {
  const filters = await searchParams
  const search = filters.q?.trim().slice(0, 160) ?? ""
  const status = bookingStatusValues.includes(filters.status as Enums<"booking_status">)
    ? (filters.status as Enums<"booking_status">)
    : undefined
  const yachtId = z.uuid().safeParse(filters.yacht).success ? filters.yacht : undefined
  const supabase = await createClient()
  const [bookingRegister, { data: yachts, error: yachtsError }] = await Promise.all([
    getBookingRegisterPage({
      cursor: filters.cursor,
      query: search,
      status,
      yachtId,
    }),
    supabase.from("yachts").select("id,name").order("name"),
  ])
  if (yachtsError) throw new Error("Unable to load bookings.")
  const visible = bookingRegister.bookings
  const activeCount = visible.filter((booking) => ["confirmed", "charter_active"].includes(booking.status)).length
  const pendingYachtfolio = visible.filter((booking) => booking.yachtfolio_status === "pending").length

  return <div className="mx-auto max-w-6xl space-y-5" data-tutorial-anchor="booking-register">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Bookings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Charter dates, availability and booking progress.</p></div><div className="flex gap-2"><Link className={cn(buttonVariants({ variant: "outline" }))} href="/bookings/availability"><CalendarCheck2 />Check availability</Link><Link className={cn(buttonVariants())} href="/bookings/new"><Plus />Confirm booking</Link></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={CalendarCheck2} label="Matching bookings" value={bookingRegister.totalCount} /><Metric icon={CheckCircle2} label="Reserved or active on page" value={activeCount} /><Metric icon={Clock3} label="Yachtfolio pending on page" value={pendingYachtfolio} /></div>
    <Card><CardHeader className="border-b"><CardTitle>All bookings</CardTitle></CardHeader><CardContent className="pt-5"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem_auto]" method="get"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search bookings" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={filters.q} name="q" placeholder="Reference, enquiry or yacht" /></label><select aria-label="Filter booking status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={status ?? ""} name="status"><option value="">All states</option>{bookingStatusValues.map((value) => <option key={value} value={value}>{bookingStatusLabels[value]}</option>)}</select><select aria-label="Filter by yacht" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm" defaultValue={yachtId ?? ""} name="yacht"><option value="">All yachts</option>{yachts?.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select><button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply</button></form></CardContent></Card>
    <Card><CardContent className="p-0">{visible.length ? <div className="divide-y">{visible.map((booking) => <Link className="block px-5 py-4 hover:bg-muted/40" href={`/bookings/${booking.id}`} key={booking.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{booking.reference}</p><Badge variant={booking.status === "cancelled" ? "outline" : "default"}>{bookingStatusLabels[booking.status]}</Badge>{booking.yachtfolio_status === "pending" ? <Badge className="border-amber-300 bg-amber-50 text-amber-900" variant="outline">Yachtfolio pending</Badge> : null}</div><p className="mt-1 text-sm">{booking.yacht_name} · {formatBookingDate(booking.charter_start_date)} – {formatBookingDate(booking.charter_end_date)}</p><p className="mt-1 text-xs text-muted-foreground">From {booking.enquiry_reference} · Buffer {formatBookingDate(booking.reserved_from)} – {formatBookingDate(booking.reserved_through)}</p></div></div></Link>)}</div> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">No matching bookings. Confirm one from an enquiry awaiting signatures.</p>}<CursorPagination currentCount={visible.length} nextCursor={bookingRegister.nextCursor} pathname="/bookings" searchParams={{ cursor: filters.cursor, q: search, status, yacht: yachtId }} totalCount={bookingRegister.totalCount} /></CardContent></Card>
  </div>
}
function Metric({ icon: Icon, label, value }: { icon: typeof CalendarCheck2; label: string; value: number }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card> }
