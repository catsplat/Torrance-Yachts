import { CalendarDays, CircleDollarSign, ClipboardCheck, Ship } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCalendarWorkspace } from "@/lib/integrations/data"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(new Date(value))
}

const icons = { charter: Ship, payment: CircleDollarSign, task: ClipboardCheck }

export default async function CalendarPage({ searchParams }: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const { events, month } = await getCalendarWorkspace(params.month)
  const monthDate = new Date(`${month}-01T00:00:00.000Z`)
  const previousMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)
  const nextMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 7)
  const months = Map.groupBy(events, (event) =>
    new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" })
      .format(new Date(event.start_at))
  )
  return (
    <div className="mx-auto max-w-6xl space-y-5" data-tutorial-anchor="calendar-register">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold">Calendar</h1><p className="mt-2 text-sm text-muted-foreground">Charters, payments and task deadlines.</p></div><nav aria-label="Calendar month" className="flex gap-2"><Link className="rounded-md border px-3 py-2 text-sm font-medium" href={`/calendar?month=${previousMonth}`}>Previous</Link><Link className="rounded-md border px-3 py-2 text-sm font-medium" href="/calendar">Today</Link><Link className="rounded-md border px-3 py-2 text-sm font-medium" href={`/calendar?month=${nextMonth}`}>Next</Link></nav></div>
      {[...months.entries()].map(([month, monthEvents]) => (
        <Card key={month}>
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" />{month}</CardTitle><CardDescription>{monthEvents.length} operational dates</CardDescription></CardHeader>
          <CardContent className="divide-y p-0">
            {monthEvents.map((event) => {
              const Icon = icons[event.kind]
              const href = event.source_type === "booking" ? `/bookings/${event.source_id}` : event.source_type === "task" ? `/tasks/${event.source_id}` : "/tasks"
              return <Link className="grid gap-3 px-5 py-4 hover:bg-muted/40 sm:grid-cols-[2rem_8rem_minmax(0,1fr)_8rem]" href={href} key={event.id}><Icon className="mt-0.5 size-4 text-primary" /><p className="text-sm font-medium">{formatDate(event.start_at)}</p><div><p className="font-medium">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.description}</p></div><div className="flex flex-col items-start gap-1"><Badge variant="outline">{event.kind}</Badge><span className="text-xs text-muted-foreground">{event.sync_status.replace("_", " ")}</span></div></Link>
            })}
          </CardContent>
        </Card>
      ))}
      {!events.length ? <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No calendar entries.</CardContent></Card> : null}
    </div>
  )
}
