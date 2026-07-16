import { ArrowLeft, BellRing, CalendarRange, CheckCircle2, FileText, History, UserRound } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { YachtForm } from "@/components/yachts/yacht-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { yachtResponsibilityLabels } from "@/lib/contacts/options"
import { formatBookingDate } from "@/lib/bookings/options"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type YachtDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; updated?: string }>
}

export default async function YachtDetailPage({ params, searchParams }: YachtDetailPageProps) {
  const { id } = await params
  const notices = await searchParams
  const supabase = await createClient()
  const { data: yacht, error } = await supabase.from("yachts").select("*").eq("id", id).single()

  if (error || !yacht) notFound()

  const { data: contactAssignments, error: contactAssignmentsError } = await supabase
    .from("yacht_contacts")
    .select(
      "id, is_primary, notifications_enabled, responsibility, contact:contacts(id, full_name, email, active)",
    )
    .eq("yacht_id", id)
    .order("is_primary", { ascending: false })

  if (contactAssignmentsError) {
    throw new Error("Unable to load yacht contact responsibilities.")
  }

  const { count: auditCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "yacht")
    .eq("entity_id", id)

  const { data: reservations, error: reservationsError } = await supabase
    .from("booking_reservations")
    .select("id,reserved_from,reserved_through,booking:bookings!booking_reservations_booking_id_fkey(id,reference,status,charter_start_date,charter_end_date)")
    .eq("yacht_id", id)
    .eq("active", true)
    .order("reserved_from")
  if (reservationsError) throw new Error("Unable to load yacht availability.")

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/yachts"><ArrowLeft className="size-4" aria-hidden="true" />Back to yachts</Link>

      {notices.created || notices.updated ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="size-4" aria-hidden="true" />{notices.created ? "Yacht record created." : "Yacht record updated."}</div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><CardTitle>{yacht.name}</CardTitle><Badge variant="outline">{yacht.status}</Badge></div><CardDescription className="mt-2">Edit the source-of-truth operational record.</CardDescription></div>
            <div className="flex flex-wrap items-center gap-3">
              <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/yachts/${id}/commercial`}><FileText aria-hidden="true" />Commercial & offers</Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><History className="size-4" aria-hidden="true" />{auditCount ?? 0} recorded change{auditCount === 1 ? "" : "s"}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6"><YachtForm mode="edit" yacht={yacht} /></CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><CalendarRange className="size-4 text-primary" />Protected availability</CardTitle><CardDescription>Live booking reservations include the required one-day operating buffer on both sides.</CardDescription></CardHeader>
        <CardContent className="p-0">{reservations.length ? <div className="divide-y">{reservations.map((reservation) => <Link className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40" href={`/bookings/${reservation.booking.id}`} key={reservation.id}><div><p className="font-medium">{reservation.booking.reference}</p><p className="mt-1 text-xs text-muted-foreground">Charter {formatBookingDate(reservation.booking.charter_start_date)} – {formatBookingDate(reservation.booking.charter_end_date)}</p></div><Badge variant="outline">Reserved {formatBookingDate(reservation.reserved_from)} – {formatBookingDate(reservation.reserved_through)}</Badge></Link>)}</div> : <p className="px-5 py-10 text-center text-sm text-muted-foreground">No active booking reservations for this yacht.</p>}</CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <UserRound aria-hidden="true" className="size-4 text-primary" />
            Operational contacts
          </CardTitle>
          <CardDescription>
            Captains, managers, operations staff, and future notification recipients.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {contactAssignments.length ? (
            <div className="divide-y">
              {contactAssignments.map((assignment) => (
                <Link
                  className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/50"
                  href={`/contacts/${assignment.contact.id}`}
                  key={assignment.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{assignment.contact.full_name}</p>
                      <Badge variant="secondary">
                        {yachtResponsibilityLabels[assignment.responsibility]}
                      </Badge>
                      {assignment.is_primary ? <Badge>Primary</Badge> : null}
                      {assignment.notifications_enabled ? (
                        <Badge variant="outline">
                          <BellRing aria-hidden="true" /> Notifications
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignment.contact.email || "No email recorded"}
                    </p>
                  </div>
                  {!assignment.contact.active ? <Badge variant="outline">Inactive</Badge> : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No operational contacts assigned. Add one from a contact record.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
