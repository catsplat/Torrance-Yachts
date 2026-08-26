import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { bufferedReservationDates } from "@/lib/bookings/validation"
import { createClient } from "@/lib/supabase/server"

export async function AvailabilitySummary({
  charterEndDate,
  charterStartDate,
  yachtId,
  yachtName,
}: {
  charterEndDate: string | null
  charterStartDate: string | null
  yachtId: string | null
  yachtName: string | null
}) {
  if (!yachtId || !charterStartDate || !charterEndDate) {
    return <p className="text-sm text-muted-foreground">Choose a yacht and charter dates to check availability.</p>
  }
  const supabase = await createClient()
  const { data } = await supabase.rpc("check_yacht_availability", {
    p_charter_end_date: charterEndDate,
    p_charter_start_date: charterStartDate,
    p_exclude_booking_id: undefined,
    p_yacht_id: yachtId,
  })
  const availability = data?.[0]
  const buffer = bufferedReservationDates(charterStartDate, charterEndDate)
  const query = new URLSearchParams({ end: charterEndDate, start: charterStartDate, yacht: yachtId })
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2"><Badge variant={availability?.available ? "default" : "destructive"}>{availability?.available ? "Available" : "Conflict"}</Badge><span className="text-sm font-medium">{yachtName}</span></div>
    <p className="text-sm text-muted-foreground">Protected dates: {buffer.reservedFrom} to {buffer.reservedThrough}.</p>
    {!availability?.available ? <p className="text-sm text-destructive">Conflicts with {availability?.conflicting_reference ?? "an active booking"}.</p> : null}
    <Link className="text-sm font-medium text-primary hover:underline" href={`/bookings/availability?${query.toString()}`}>Open availability calendar</Link>
  </div>
}
