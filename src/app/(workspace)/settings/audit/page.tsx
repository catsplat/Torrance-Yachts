import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getAuditPage } from "@/lib/audit/data"
import { getCurrentUser } from "@/lib/auth/current-user"
import { redirect } from "next/navigation"

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const page = await getAuditPage({ action: params.action, actorId: params.actor, cursor: params.cursor, entityType: params.entity, from: params.from, source: params.source, to: params.to })
  return <div className="mx-auto max-w-7xl space-y-5">
    <div><h1 className="text-3xl font-semibold">Audit log</h1><p className="mt-2 text-sm text-muted-foreground">Administrative and operational changes.</p></div>
    <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-xs font-medium">Actor<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.actor ?? ""} name="actor"><option value="">All staff</option>{page.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium">Action<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.action ?? ""} name="action"><option value="">All actions</option><option value="insert">Created</option><option value="update">Updated</option><option value="delete">Deleted</option></select></label>
      <label className="grid gap-1 text-xs font-medium">Record type<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.entity ?? ""} name="entity" /></label>
      <label className="grid gap-1 text-xs font-medium">Source<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.source ?? ""} name="source" /></label>
      <label className="grid gap-1 text-xs font-medium">From<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.from ?? ""} name="from" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium">To<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={params.to ?? ""} name="to" type="date" /></label>
      <button className="self-end rounded-md border px-3 py-2 text-sm font-medium" type="submit">Apply</button>
    </form>
    <Card><CardHeader className="border-b"><CardTitle>{page.totalCount} events</CardTitle></CardHeader><CardContent className="divide-y p-0">{page.events.map((event) => { const values = event.new_values && typeof event.new_values === "object" && !Array.isArray(event.new_values) ? event.new_values : null; const reason = values && typeof values.reason === "string" ? values.reason : null; return <article className="grid gap-3 px-5 py-4 lg:grid-cols-[12rem_10rem_minmax(0,1fr)_12rem]" key={event.id}><div><p className="font-medium">{event.actor_name ?? "System"}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("en-GB")}</p></div><div><Badge variant="outline">{event.action}</Badge><p className="mt-2 text-xs">{event.entity_type}</p></div><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{event.entity_id}</p>{reason ? <p className="mt-2 text-sm">{reason}</p> : null}<details className="mt-2 text-xs"><summary className="cursor-pointer font-medium">Redacted change</summary><pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3">{JSON.stringify({ after: event.new_values, before: event.old_values }, null, 2)}</pre></details></div><p className="text-xs text-muted-foreground">{event.source}</p></article> })}</CardContent><CursorPagination currentCount={page.events.length} nextCursor={page.nextCursor} pathname="/settings/audit" searchParams={{ action: params.action, actor: params.actor, cursor: params.cursor, entity: params.entity, from: params.from, source: params.source, to: params.to }} totalCount={page.totalCount} /></Card>
  </div>
}
