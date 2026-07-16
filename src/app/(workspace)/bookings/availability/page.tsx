import { ArrowLeft, CalendarCheck2 } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBookingDate } from "@/lib/bookings/options"
import { availabilitySchema, bufferedReservationDates } from "@/lib/bookings/validation"
import { createClient } from "@/lib/supabase/server"

type Props = { searchParams: Promise<{ yacht?: string; start?: string; end?: string }> }
export default async function AvailabilityPage({ searchParams }: Props) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: yachts } = await supabase.from("yachts").select("id,name").eq("status", "active").order("name")
  const parsed = availabilitySchema.safeParse({ yacht_id: query.yacht, charter_start_date: query.start, charter_end_date: query.end })
  const result = parsed.success ? await supabase.rpc("check_yacht_availability", { p_yacht_id: parsed.data.yacht_id, p_charter_start_date: parsed.data.charter_start_date, p_charter_end_date: parsed.data.charter_end_date, p_exclude_booking_id: undefined }) : null
  const availability = result?.data?.[0]
  const buffer = parsed.success ? bufferedReservationDates(parsed.data.charter_start_date, parsed.data.charter_end_date) : null
  return <div className="mx-auto max-w-4xl space-y-5"><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/bookings"><ArrowLeft className="size-4" />Back to bookings</Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live reservations</p><h1 className="mt-1 text-3xl font-semibold">Check yacht availability</h1><p className="mt-2 text-sm text-muted-foreground">Every check includes one protected operational day before and after the requested charter.</p></div><Card><CardHeader className="border-b"><CardTitle>Charter dates</CardTitle><CardDescription>Results are advisory until the booking confirmation transaction reserves the dates.</CardDescription></CardHeader><CardContent className="pt-5"><form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" method="get"><select aria-label="Yacht" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={query.yacht ?? ""} name="yacht" required><option disabled value="">Select yacht</option>{yachts?.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name}</option>)}</select><input aria-label="Charter start" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={query.start} name="start" required type="date" /><input aria-label="Charter end" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={query.end} name="end" required type="date" /><button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">Check</button></form></CardContent></Card>{parsed.success ? <Card className={availability?.available ? "border-emerald-200" : "border-rose-200"}><CardContent className="flex items-start gap-4 pt-5"><CalendarCheck2 className={availability?.available ? "text-emerald-700" : "text-rose-700"} /><div><div className="flex items-center gap-2"><p className="font-semibold">{availability?.available ? "Available" : "Unavailable"}</p><Badge variant="outline">Buffer {formatBookingDate(buffer!.reservedFrom)} – {formatBookingDate(buffer!.reservedThrough)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{availability?.available ? "No active reservation overlaps the requested buffered period." : `Conflicts with ${availability?.conflicting_reference}, reserved ${formatBookingDate(availability!.reserved_from!)} – ${formatBookingDate(availability!.reserved_through!)}.`}</p></div></CardContent></Card> : query.yacht ? <p className="text-sm text-destructive">Choose valid dates with the end after the start.</p> : null}</div>
}
