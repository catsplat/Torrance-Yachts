import { BellRing, CheckCheck, ExternalLink } from "lucide-react"
import Link from "next/link"

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(workspace)/notifications/actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(250)
  if (error) throw new Error("Unable to load notifications.")
  const unreadCount = data.filter((notification) => !notification.read_at).length
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Personal operations feed
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Internal alerts generated from email, tasks, payments, charters, and
            integration health.
          </p>
        </div>
        {unreadCount ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline">
              <CheckCheck aria-hidden="true" />
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" />
            {unreadCount} unread
          </CardTitle>
          <CardDescription>
            AI summaries are suggestions and never replace source-email review.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {data.length ? data.map((notification) => (
            <article
              className={cn(
                "grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto]",
                !notification.read_at && "bg-primary/[0.035]",
              )}
              key={notification.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={!notification.read_at ? "default" : "outline"}>
                    {notification.priority}
                  </Badge>
                  <Badge variant="outline">{notification.channel.replaceAll("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/London",
                    }).format(new Date(notification.created_at))}
                  </span>
                </div>
                <h2 className="mt-3 font-medium">{notification.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {notification.body}
                </p>
              </div>
              <div className="flex items-start gap-2">
                {notification.action_url ? (
                  <Link
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href={notification.action_url}
                  >
                    Open
                    <ExternalLink aria-hidden="true" />
                  </Link>
                ) : null}
                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input name="notificationId" type="hidden" value={notification.id} />
                    <Button size="sm" type="submit" variant="ghost">Mark read</Button>
                  </form>
                ) : null}
              </div>
            </article>
          )) : (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
