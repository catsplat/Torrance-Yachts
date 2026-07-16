import { AlertCircle, Mail, Paperclip, Search } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getEmailInbox } from "@/lib/emails/data"
import { emailClassificationLabels, emailProcessingLabels } from "@/lib/emails/options"

type Props = { searchParams: Promise<{ classification?: string; q?: string }> }

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London",
  }).format(new Date(value))
}
export default async function EmailInboxPage({ searchParams }: Props) {
  const filters = await searchParams
  const messages = await getEmailInbox()
  const query = filters.q?.trim().toLowerCase() ?? ""
  const visible = messages.filter((message) =>
    (!filters.classification || filters.classification === "all" || message.classification === filters.classification) &&
    (!query || [message.sender_name, message.sender_email, message.subject, message.snippet]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(query)))
  )
  const reviewCount = messages.filter((message) => message.processing_status === "review_required").length

  return (
    <div className="mx-auto max-w-7xl space-y-5" data-tutorial-anchor="email-inbox">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operational mailbox</p><h1 className="mt-1 text-3xl font-semibold">Email inbox</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Gmail messages are imported once, routed by safe deterministic evidence, and held for human review when uncertain.</p></div>
        <Badge className={reviewCount ? "border-amber-300 bg-amber-50 text-amber-900" : ""} variant="outline">{reviewCount} need review</Badge>
      </div>
      <Card><CardContent className="pt-6"><form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" method="get"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" defaultValue={filters.q ?? ""} name="q" placeholder="Sender, subject, or snippet" /></div><select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={filters.classification ?? "all"} name="classification"><option value="all">All classifications</option>{Object.entries(emailClassificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">Filter</button></form></CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle>Message register</CardTitle></CardHeader><CardContent className="p-0">{visible.length ? <div className="divide-y">{visible.map((message) => <Link className="grid gap-3 px-5 py-4 hover:bg-muted/40 lg:grid-cols-[12rem_minmax(0,1fr)_12rem]" href={`/emails/${message.id}`} key={message.id}><div><p className="truncate font-medium">{message.sender_name || message.sender_email}</p><p className="mt-1 truncate text-xs text-muted-foreground">{message.sender_email}</p><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(message.received_at)}</p></div><div className="min-w-0"><div className="flex items-center gap-2">{message.processing_status === "review_required" ? <AlertCircle className="size-4 text-amber-700" /> : <Mail className="size-4 text-primary" />}<p className="truncate font-medium">{message.subject}</p>{message.has_attachments ? <Paperclip className="size-3.5 text-muted-foreground" /> : null}</div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{message.snippet || "No plain-text snippet supplied."}</p>{message.thread.enquiry ? <p className="mt-2 text-xs text-primary">{message.thread.enquiry.reference} · {message.thread.enquiry.summary}</p> : null}</div><div className="flex flex-wrap content-start gap-2"><Badge variant="outline">{emailClassificationLabels[message.classification]}</Badge><Badge variant="secondary">{emailProcessingLabels[message.processing_status]}</Badge></div></Link>)}</div> : <p className="p-8 text-center text-sm text-muted-foreground">No imported messages match these filters.</p>}</CardContent></Card>
    </div>
  )
}
