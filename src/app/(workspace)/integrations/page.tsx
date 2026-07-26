import { AlertTriangle, CheckCircle2, ExternalLink, Send, Settings2, Sheet } from "lucide-react"
import Link from "next/link"

import {
  DeliveryRetryForm,
  NotificationDraftForm,
  NotificationReviewForm,
} from "@/components/integrations/integration-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getIntegrationWorkspace } from "@/lib/integrations/data"

function formatDateTime(value: string | null) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value))
}

export default async function IntegrationsPage() {
  const [workspace, user] = await Promise.all([getIntegrationWorkspace(), getCurrentUser()])
  const pendingReviews = workspace.notifications.filter((item) => item.status === "pending_approval")
  const failedDeliveries = workspace.deliveries.filter((item) => item.status === "failed")
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Delivery centre</p>
        <h1 className="mt-1 text-3xl font-semibold">Notification delivery</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review communication awaiting approval, create internal alerts, and resolve delivery problems. Company provider settings are kept separate from this daily workspace.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Send} label="Pending approvals" value={pendingReviews.length} />
        <Metric icon={AlertTriangle} label="Failed deliveries" value={failedDeliveries.length} />
        <Metric icon={Sheet} label="Workbook snapshots" value={workspace.snapshots.length} />
      </div>

      <Card data-tutorial-anchor="integration-approvals">
        <CardHeader className="border-b"><CardTitle>Create controlled notification</CardTitle><CardDescription>Telegram and Gmail drafts are held for a separate approval. Gmail creates a draft only and never sends automatically.</CardDescription></CardHeader>
        <CardContent className="pt-5"><NotificationDraftForm contacts={workspace.contacts} users={workspace.users} /></CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-4" /></div><div><p className="font-medium">Company connections</p><p className="mt-1 text-sm text-muted-foreground">Provider activation, n8n controls, and technical errors are administrator-only settings.</p></div></div>
          {user?.role === "administrator" ? <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/settings/integrations">Manage connections <ExternalLink className="size-3.5" /></Link> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Human notification approvals</CardTitle><CardDescription>External drafts and consequential notifications remain held until reviewed.</CardDescription></CardHeader>
        <CardContent className="divide-y p-0">
          {pendingReviews.length ? pendingReviews.map((notification) => (
            <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.7fr)]" key={notification.id}>
              <div>
                <div className="flex flex-wrap gap-2"><Badge>{notification.priority}</Badge><Badge variant="outline">{notification.channel.replace("_", " ")}</Badge></div>
                <p className="mt-3 font-medium">{notification.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{notification.body}</p>
              </div>
              <NotificationReviewForm notificationId={notification.id} />
            </div>
          )) : <p className="p-5 text-sm text-muted-foreground">No notifications are waiting for approval.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Delivery history</CardTitle><CardDescription>Provider IDs, attempts, failures, leases, and retries remain visible here.</CardDescription></CardHeader>
        <CardContent className="divide-y p-0">
          {workspace.deliveries.length ? workspace.deliveries.map((delivery) => (
            <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(18rem,.7fr)]" key={delivery.id}>
              <div><p className="font-medium">{delivery.operation.replaceAll("_", " ")}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{delivery.idempotency_key}</p><p className="mt-1 text-xs text-muted-foreground">{delivery.provider} · attempt {delivery.attempt_count}</p></div>
              <div><Badge variant={delivery.status === "delivered" ? "default" : "outline"}>{delivery.status}</Badge></div>
              <div>
                {delivery.last_error_message ? <p className="mb-2 text-sm text-destructive">{delivery.last_error_message}</p> : delivery.status === "delivered" ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Delivered {formatDateTime(delivery.delivered_at)}</p> : <p className="text-sm text-muted-foreground">Next attempt {formatDateTime(delivery.next_attempt_at)}</p>}
                {delivery.status === "failed" && user?.role === "administrator" ? <DeliveryRetryForm deliveryId={delivery.id} /> : null}
              </div>
            </div>
          )) : <p className="p-5 text-sm text-muted-foreground">No external delivery attempts yet.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Send; label: string; value: number }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
}
