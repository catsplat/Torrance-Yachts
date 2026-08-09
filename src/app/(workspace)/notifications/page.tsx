import { BellRing, CheckCheck, ExternalLink } from "lucide-react"
import Link from "next/link"

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(workspace)/notifications/actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getNotificationPage } from "@/lib/notifications/data"
import { cn } from "@/lib/utils"

type Props = { searchParams: Promise<{ cursor?: string; state?: string }> }

export default async function NotificationsPage({ searchParams }: Props) {
  const filters = await searchParams
  const state = filters.state === "read" || filters.state === "unread" ? filters.state : "all"
  const register = await getNotificationPage({
    cursor: filters.cursor,
    read: state === "all" ? undefined : state === "read",
  })

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-semibold">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Email, task, payment and charter alerts.</p></div>
        {register.unreadCount ? <form action={markAllNotificationsReadAction}><Button type="submit" variant="outline"><CheckCheck aria-hidden="true" />Mark all read</Button></form> : null}
      </div>

      <nav aria-label="Notification filters" className="flex gap-2">
        {(["all", "unread", "read"] as const).map((value) => (
          <Link className={cn(buttonVariants({ size: "sm", variant: state === value ? "default" : "outline" }))} href={value === "all" ? "/notifications" : `/notifications?state=${value}`} key={value}>{value === "all" ? "All" : value === "unread" ? `Unread (${register.unreadCount})` : "Read"}</Link>
        ))}
      </nav>

      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><BellRing className="size-5 text-primary" />{register.totalCount} {state === "all" ? "notifications" : state}</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {register.notifications.length ? register.notifications.map((notification) => (
            <article className={cn("grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto]", !notification.read_at && "bg-primary/[0.035]")} key={notification.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge variant={!notification.read_at ? "default" : "outline"}>{notification.priority}</Badge><Badge variant="outline">{notification.channel.replaceAll("_", " ")}</Badge><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(notification.created_at))}</span></div>
                <h2 className="mt-3 font-medium">{notification.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{notification.body}</p>
              </div>
              <div className="flex items-start gap-2">
                {notification.action_url ? <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={notification.action_url}>Open<ExternalLink aria-hidden="true" /></Link> : null}
                {!notification.read_at ? <form action={markNotificationReadAction}><input name="notificationId" type="hidden" value={notification.id} /><Button size="sm" type="submit" variant="ghost">Mark read</Button></form> : null}
              </div>
            </article>
          )) : <p className="px-5 py-12 text-center text-sm text-muted-foreground">No {state === "all" ? "notifications" : state + " notifications"}.</p>}
          <CursorPagination currentCount={register.notifications.length} nextCursor={register.nextCursor} pathname="/notifications" searchParams={{ cursor: filters.cursor, state: state === "all" ? undefined : state }} totalCount={register.totalCount} />
        </CardContent>
      </Card>
    </div>
  )
}
