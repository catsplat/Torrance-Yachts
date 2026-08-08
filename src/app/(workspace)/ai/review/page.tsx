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
import { getAiReviewQueue } from "@/lib/ai/data"

export default async function AiReviewQueuePage() {
  const suggestions = await getAiReviewQueue()
  const pending = suggestions.filter((item) => item.status === "pending_review")
  const reviewed = suggestions.filter((item) => item.status !== "pending_review")
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Review suggestions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check extracted email and contract details before they are used.
        </p>
      </div>
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
                  <Badge variant="secondary">{item.run.provider} · {item.run.model}</Badge>
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
    </div>
  )
}
