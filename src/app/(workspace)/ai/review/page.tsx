import { BrainCircuit, ChevronRight } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getAiReviewPage } from "@/lib/ai/data"

export default async function AiReviewQueuePage({ searchParams }: {
  searchParams: Promise<{ cursor?: string; status?: string }>
}) {
  const params = await searchParams
  const allowedStatuses = ["approved", "pending_review", "rejected", "superseded"] as const
  const status = allowedStatuses.find((candidate) => candidate === params.status)
  const page = await getAiReviewPage({ cursor: params.cursor, status })
  const pending = page.suggestions.filter((item) => item.status === "pending_review")
  const reviewed = page.suggestions.filter((item) => item.status !== "pending_review")
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Review suggestions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check extracted email and contract details before they are used.
        </p>
      </div>
      <form className="flex flex-wrap gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Status
          <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={status ?? ""} name="status">
            <option value="">All suggestions</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="superseded">Superseded</option>
          </select>
        </label>
        <button className="self-end rounded-md border px-3 py-2 text-sm font-medium" type="submit">Apply</button>
      </form>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5" />
            Pending review
          </CardTitle>
          <CardDescription>{pending.length} waiting.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {pending.length ? pending.map((item) => (
            <Link
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              href={item.href}
              key={item.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.analysis_kind.replace("_", " ")}</p>
                  <Badge variant="outline">
                    {Math.round(Number(item.confidence) * 100)}% confidence
                  </Badge>
                  <Badge variant="secondary">{item.provider} · {item.model}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{item.sourceLabel}</p>
                <p className="mt-2 text-sm">{item.summary}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )) : (
            <p className="p-5 text-sm text-muted-foreground">Nothing waiting for review.</p>
          )}
        </CardContent>
      </Card>
      {reviewed.length ? (
        <Card>
          <CardHeader className="border-b"><CardTitle>Recently reviewed</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {reviewed.slice(0, 20).map((item) => (
              <Link className="flex items-center justify-between gap-3 px-5 py-3 text-sm" href={item.href} key={item.id}>
                <span className="truncate">{item.sourceLabel}</span>
                <Badge variant="outline">{item.status.replace("_", " ")}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <CursorPagination
        currentCount={page.suggestions.length}
        nextCursor={page.nextCursor}
        pathname="/ai/review"
        searchParams={{ cursor: params.cursor, status }}
        totalCount={page.totalCount}
      />
    </div>
  )
}
