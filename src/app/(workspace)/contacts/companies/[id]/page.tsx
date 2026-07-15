import { ArrowLeft, CheckCircle2, History, UserRound } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CompanyForm } from "@/components/contacts/company-form"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; updated?: string }>
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: CompanyDetailPageProps) {
  const { id } = await params
  const notices = await searchParams
  const supabase = await createClient()
  const [companyResult, contactsResult] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase
      .from("company_contacts")
      .select(
        "id, is_primary, job_title, contact:contacts(id, full_name, email, active)",
      )
      .eq("company_id", id)
      .order("is_primary", { ascending: false }),
  ])

  if (companyResult.error || !companyResult.data) notFound()
  if (contactsResult.error) throw new Error("Unable to load company contacts.")

  const company = companyResult.data
  const { count: auditCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "company")
    .eq("entity_id", id)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/contacts/companies"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to companies
      </Link>

      {notices.created || notices.updated ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {notices.created ? "Company record created." : "Company record updated."}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{company.name}</CardTitle>
                  <Badge variant={company.active ? "secondary" : "outline"}>
                    {company.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  Edit the source-of-truth organisation record.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <History aria-hidden="true" className="size-4" />
                {auditCount ?? 0} recorded change{auditCount === 1 ? "" : "s"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <CompanyForm company={company} mode="edit" />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="size-4 text-primary" />
              Linked contacts
            </CardTitle>
            <CardDescription>
              Relationships are managed from each contact record.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {contactsResult.data.length ? (
              <div className="divide-y">
                {contactsResult.data.map((assignment) => (
                  <Link
                    className="block px-4 py-3 hover:bg-muted/50"
                    href={`/contacts/${assignment.contact.id}`}
                    key={assignment.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{assignment.contact.full_name}</p>
                      {assignment.is_primary ? <Badge>Primary</Badge> : null}
                      {!assignment.contact.active ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignment.job_title || assignment.contact.email || "No job title recorded"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No contacts linked to this company.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
