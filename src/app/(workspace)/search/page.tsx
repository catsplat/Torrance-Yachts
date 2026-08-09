import { Search } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = (await searchParams).q?.trim().slice(0, 120) ?? ""
  const supabase = await createClient()
  const safeQuery = query
    .replaceAll(/[^\p{L}\p{N}@._+\-\s]/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
  const { data: results, error } = safeQuery.length >= 2
    ? await supabase.rpc("search_workspace", { p_limit_per_type: 8, p_query: safeQuery })
    : { data: [], error: null }
  if (error) throw new Error("The workspace search could not be completed.")
  const labels: Record<string, string> = {
    booking: "Bookings", contact: "Contacts", email: "Emails",
    enquiry: "Enquiries", task: "Tasks", yacht: "Yachts",
  }
  const sections = Object.entries(labels).map(([type, label]) => {
    const rows = (results ?? []).filter((row) => row.entity_type === type)
    return {
      label,
      rows: rows.map((row) => ({
        href: row.href, primary: row.primary_label,
        secondary: row.secondary_label, status: row.status_label,
      })),
      totalCount: Number(rows[0]?.total_count ?? 0),
    }
  })
  const total = sections.reduce((sum, section) => sum + section.totalCount, 0)
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Operational records
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Workspace search</h1>
      </div>
      <form action="/search" className="relative max-w-2xl">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input defaultValue={query} minLength={2} name="q" placeholder="Search by reference, name, email, yacht, or task..." required type="search" className="pl-9" />
      </form>
      {safeQuery.length < 2 ? (
        <p className="text-sm text-muted-foreground">Enter at least two characters.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? "" : "s"} for “{query}”
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {sections.filter((section) => section.rows.length).map((section) => (
              <Card key={section.label}>
                <CardHeader className="border-b">
                  <CardTitle>{section.label}</CardTitle>
                  <CardDescription>
                    {section.totalCount} matching record{section.totalCount === 1 ? "" : "s"}
                    {section.totalCount > section.rows.length ? ` · showing ${section.rows.length}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {section.rows.map((row) => (
                    <Link className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40" href={row.href} key={row.href}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{row.primary}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{row.secondary}</span>
                      </span>
                      <Badge variant="outline">{row.status.replaceAll("_", " ")}</Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
