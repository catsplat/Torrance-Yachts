import { ArrowLeft, CheckCircle2, History } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { YachtForm } from "@/components/yachts/yacht-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

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

  const { count: auditCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "yacht")
    .eq("entity_id", id)

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
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><History className="size-4" aria-hidden="true" />{auditCount ?? 0} recorded change{auditCount === 1 ? "" : "s"}</div>
          </div>
        </CardHeader>
        <CardContent className="pt-6"><YachtForm mode="edit" yacht={yacht} /></CardContent>
      </Card>
    </div>
  )
}
