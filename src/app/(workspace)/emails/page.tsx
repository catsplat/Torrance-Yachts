import { AlertCircle, Mail, Paperclip, Search } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { Input } from "@/components/ui/input"
import { getEmailInboxPage } from "@/lib/emails/data"
import { emailClassificationLabels, emailProcessingLabels } from "@/lib/emails/options"
import type { Enums } from "@/types/database"

type Props = {
  searchParams: Promise<{ classification?: string; cursor?: string; q?: string }>
}

const classificationValues = Object.keys(
  emailClassificationLabels,
) as Enums<"email_classification">[]

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value))
}

export default async function EmailInboxPage({ searchParams }: Props) {
  const filters = await searchParams
  const query = filters.q?.trim().slice(0, 160) ?? ""
  const classification = classificationValues.includes(
    filters.classification as Enums<"email_classification">,
  )
    ? filters.classification as Enums<"email_classification">
    : undefined
  const inbox = await getEmailInboxPage({
    classification,
    cursor: filters.cursor,
    query,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-5" data-tutorial-anchor="email-inbox">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Inbox</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review new enquiries, follow-ups and internal email.
          </p>
        </div>
        <Badge
          className={inbox.reviewCount ? "border-amber-300 bg-amber-50 text-amber-900" : ""}
          variant="outline"
        >
          {inbox.reviewCount} need review
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" method="get">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search email inbox"
                className="pl-9"
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="Sender, subject, or snippet"
              />
            </div>
            <select
              aria-label="Filter email inbox by classification"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={classification ?? "all"}
              name="classification"
            >
              <option value="all">All classifications</option>
              {Object.entries(emailClassificationLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inbox.messages.length ? (
            <div className="divide-y">
              {inbox.messages.map((message) => (
                <Link
                  className="grid gap-3 px-5 py-4 hover:bg-muted/40 lg:grid-cols-[12rem_minmax(0,1fr)_12rem]"
                  href={`/emails/${message.id}`}
                  key={message.id}
                >
                  <div>
                    <p className="truncate font-medium">{message.sender_name || message.sender_email}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{message.sender_email}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(message.received_at)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {message.processing_status === "review_required"
                        ? <AlertCircle className="size-4 text-amber-700" />
                        : <Mail className="size-4 text-primary" />}
                      <p className="truncate font-medium">{message.subject}</p>
                      {message.has_attachments ? <Paperclip className="size-3.5 text-muted-foreground" /> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {message.snippet || "No plain-text snippet supplied."}
                    </p>
                    {message.enquiry_reference ? (
                      <p className="mt-2 text-xs text-primary">
                        {message.enquiry_reference} · {message.enquiry_summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap content-start gap-2">
                    <Badge variant="outline">{emailClassificationLabels[message.classification]}</Badge>
                    <Badge variant="secondary">{emailProcessingLabels[message.processing_status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No imported messages match these filters.
            </p>
          )}
          <CursorPagination
            currentCount={inbox.messages.length}
            nextCursor={inbox.nextCursor}
            pathname="/emails"
            searchParams={{
              classification,
              cursor: filters.cursor,
              q: query,
            }}
            totalCount={inbox.totalCount}
          />
        </CardContent>
      </Card>
    </div>
  )
}
