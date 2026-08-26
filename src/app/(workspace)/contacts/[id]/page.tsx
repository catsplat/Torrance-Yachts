import {
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  History,
  Ship,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  removeCompanyAssignmentAction,
  removeYachtAssignmentAction,
} from "@/app/(workspace)/contacts/actions"
import {
  CompanyAssignmentForm,
  YachtAssignmentForm,
} from "@/components/contacts/assignment-forms"
import { ContactForm } from "@/components/contacts/contact-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { yachtResponsibilityLabels } from "@/lib/contacts/options"
import { createClient } from "@/lib/supabase/server"

type ContactDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; updated?: string }>
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: ContactDetailPageProps) {
  const { id } = await params
  const notices = await searchParams
  const supabase = await createClient()

  const [contactResult, companyLinksResult, yachtLinksResult, companiesResult, yachtsResult] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase
        .from("company_contacts")
        .select("id, is_primary, job_title, company:companies(id, name, active)")
        .eq("contact_id", id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("yacht_contacts")
        .select(
          "id, is_primary, notes, notifications_enabled, responsibility, yacht:yachts(id, name, status)",
        )
        .eq("contact_id", id)
        .order("is_primary", { ascending: false }),
      supabase.from("companies").select("id, name").eq("active", true).order("name"),
      supabase.from("yachts").select("id, name").order("name"),
    ])

  if (contactResult.error || !contactResult.data) notFound()
  if (
    companyLinksResult.error ||
    yachtLinksResult.error ||
    companiesResult.error ||
    yachtsResult.error
  ) {
    throw new Error("Unable to load the contact relationships.")
  }

  const contact = contactResult.data
  const { count: auditCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "contact")
    .eq("entity_id", id)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/contacts"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to contacts
      </Link>

      {notices.created || notices.updated ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {notices.created ? "Contact record created." : "Contact record updated."}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{contact.full_name}</CardTitle>
                <Badge variant={contact.active ? "secondary" : "outline"}>
                  {contact.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                Edit the single source-of-truth contact record.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History aria-hidden="true" className="size-4" />
              {auditCount ?? 0} recorded change{auditCount === 1 ? "" : "s"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ContactForm contact={contact} mode="edit" />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 aria-hidden="true" className="size-4 text-primary" />
              Companies
            </CardTitle>
            <CardDescription>Brokerage, employer, or supplier relationships.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {companyLinksResult.data.length ? (
              <div className="divide-y rounded-xl border">
                {companyLinksResult.data.map((assignment) => (
                  <div
                    className="flex items-start justify-between gap-3 p-3"
                    key={assignment.id}
                  >
                    <div className="min-w-0">
                      <Link
                        className="font-medium hover:underline"
                        href={`/contacts/companies/${assignment.company.id}`}
                      >
                        {assignment.company.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {assignment.job_title || "Job title not recorded"}
                      </p>
                      {assignment.is_primary ? (
                        <Badge className="mt-2" variant="secondary">Primary</Badge>
                      ) : null}
                    </div>
                    <form
                      action={removeCompanyAssignmentAction.bind(
                        null,
                        assignment.id,
                        id,
                      )}
                    >
                      <Button aria-label={`Remove ${assignment.company.name}`} size="icon-sm" type="submit" variant="ghost">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No company relationships yet.</p>
            )}
            <CompanyAssignmentForm companies={companiesResult.data} contactId={id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Ship aria-hidden="true" className="size-4 text-primary" />
              Yacht assignments
            </CardTitle>
            <CardDescription>
              Operational ownership and notification eligibility by yacht.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {yachtLinksResult.data.length ? (
              <div className="divide-y rounded-xl border">
                {yachtLinksResult.data.map((assignment) => (
                  <div
                    className="flex items-start justify-between gap-3 p-3"
                    key={assignment.id}
                  >
                    <div className="min-w-0">
                      <Link
                        className="font-medium hover:underline"
                        href={`/yachts/${assignment.yacht.id}`}
                      >
                        {assignment.yacht.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">
                          {yachtResponsibilityLabels[assignment.responsibility]}
                        </Badge>
                        {assignment.is_primary ? <Badge>Primary</Badge> : null}
                        {assignment.notifications_enabled ? (
                          <Badge variant="outline">
                            <BellRing aria-hidden="true" /> Notifications
                          </Badge>
                        ) : null}
                      </div>
                      {assignment.notes ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {assignment.notes}
                        </p>
                      ) : null}
                    </div>
                    <form
                      action={removeYachtAssignmentAction.bind(
                        null,
                        assignment.id,
                        id,
                      )}
                    >
                      <Button aria-label={`Remove ${assignment.yacht.name} responsibility`} size="icon-sm" type="submit" variant="ghost">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No yacht assignments yet.</p>
            )}
            <YachtAssignmentForm contactId={id} yachts={yachtsResult.data} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
