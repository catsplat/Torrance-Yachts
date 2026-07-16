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
  const pattern = `%${safeQuery}%`
  const results = safeQuery.length >= 2
    ? await Promise.all([
        supabase.from("enquiries").select("id, reference, summary, status").or(`reference.ilike.${pattern},summary.ilike.${pattern}`).limit(8),
        supabase.from("bookings").select("id, reference, status, yacht:yachts!bookings_yacht_id_fkey(name)").or(`reference.ilike.${pattern},embarkation_port.ilike.${pattern},disembarkation_port.ilike.${pattern}`).limit(8),
        supabase.from("tasks").select("id, title, status, step_code").or(`title.ilike.${pattern},step_code.ilike.${pattern}`).limit(8),
        supabase.from("yachts").select("id, name, builder, status").or(`name.ilike.${pattern},builder.ilike.${pattern}`).limit(8),
        supabase.from("contacts").select("id, full_name, email").or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(8),
        supabase.from("email_messages").select("id, subject, sender_email, classification").or(`subject.ilike.${pattern},sender_email.ilike.${pattern}`).limit(8),
      ])
    : null
  if (results?.some((result) => result.error)) {
    throw new Error("The workspace search could not be completed.")
  }
  const sections = results ? [
    {
      label: "Enquiries",
      rows: (results[0].data ?? []).map((row) => ({ href: `/enquiries/${row.id}`, primary: row.reference, secondary: row.summary, status: row.status })),
    },
    {
      label: "Bookings",
      rows: (results[1].data ?? []).map((row) => ({ href: `/bookings/${row.id}`, primary: row.reference, secondary: row.yacht.name, status: row.status })),
    },
    {
      label: "Tasks",
      rows: (results[2].data ?? []).map((row) => ({ href: `/tasks/${row.id}`, primary: row.title, secondary: row.step_code ?? "Operational task", status: row.status })),
    },
    {
      label: "Yachts",
      rows: (results[3].data ?? []).map((row) => ({ href: `/yachts/${row.id}`, primary: row.name, secondary: row.builder ?? "Builder not recorded", status: row.status })),
    },
    {
      label: "Contacts",
      rows: (results[4].data ?? []).map((row) => ({ href: `/contacts/${row.id}`, primary: row.full_name, secondary: row.email ?? "No email", status: "contact" })),
    },
    {
      label: "Emails",
      rows: (results[5].data ?? []).map((row) => ({ href: `/emails/${row.id}`, primary: row.subject, secondary: row.sender_email, status: row.classification })),
    },
  ] : []
  const total = sections.reduce((sum, section) => sum + section.rows.length, 0)
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
                  <CardDescription>{section.rows.length} matching records</CardDescription>
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
