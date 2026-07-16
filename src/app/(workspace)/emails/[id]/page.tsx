import { ArrowLeft, History, Paperclip } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EmailClassificationForm } from "@/components/emails/email-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getEmailMessageDetail } from "@/lib/emails/data"
import { emailClassificationLabels, emailProcessingLabels } from "@/lib/emails/options"

type Props = { params: Promise<{ id: string }> }

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London",
  }).format(new Date(value))
}
export default async function EmailDetailPage({ params }: Props) {
  const { id } = await params
  const record = await getEmailMessageDetail(id).catch(() => null)
  if (!record) notFound()
  const { message } = record
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/emails"><ArrowLeft className="size-4" />Back to email inbox</Link>
      <Card><CardHeader className="border-b"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{message.sender_name || message.sender_email} · {message.sender_email}</p><h1 className="mt-1 text-2xl font-semibold">{message.subject}</h1><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(message.received_at)} · Gmail message {message.provider_message_id}</p></div><div className="flex gap-2"><Badge variant="outline">{emailClassificationLabels[message.classification]}</Badge><Badge variant="secondary">{emailProcessingLabels[message.processing_status]}</Badge></div></div></CardHeader><CardContent className="space-y-4 pt-5"><div><p className="text-xs font-medium text-muted-foreground">Recipients</p><p className="mt-1 text-sm">{message.recipient_emails.join(", ")}</p></div><div><p className="text-xs font-medium text-muted-foreground">Plain-text content</p><div className="mt-2 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-6">{message.body_text || message.snippet || "No plain-text body was supplied by the adapter."}</div></div></CardContent></Card>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)]"><div className="space-y-5"><Card><CardHeader className="border-b"><CardTitle>Review and route</CardTitle><CardDescription>AI suggestions arrive in Phase 10. This human-controlled form remains the authority.</CardDescription></CardHeader><CardContent className="pt-5"><EmailClassificationForm contacts={record.contacts} enquiries={record.enquiries} message={message} /></CardContent></Card><Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><History className="size-4" />Classification history</CardTitle></CardHeader><CardContent className="space-y-3 pt-5">{record.history.map((entry) => <div className="rounded-lg border p-3 text-sm" key={entry.id}><p className="font-medium">{entry.from_classification ?? "received"} → {entry.to_classification}</p><p className="mt-1 text-muted-foreground">{entry.reason}</p><p className="mt-2 text-xs text-muted-foreground">{entry.actor?.display_name ?? "Deterministic router"} · {formatDateTime(entry.created_at)}</p></div>)}</CardContent></Card></div><div className="space-y-5"><Card><CardHeader className="border-b"><CardTitle>Thread association</CardTitle></CardHeader><CardContent className="space-y-2 pt-5"><p className="text-sm">{message.thread.message_count} message(s) in Gmail thread</p>{message.thread.enquiry ? <Link className="text-sm text-primary underline" href={`/enquiries/${message.thread.enquiry.id}`}>{message.thread.enquiry.reference} · {message.thread.enquiry.summary}</Link> : <p className="text-sm text-muted-foreground">Not linked to an enquiry.</p>}<p className="text-xs text-muted-foreground">Rule: {message.deterministic_rule ?? "None"}</p></CardContent></Card><Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Paperclip className="size-4" />Attachments</CardTitle></CardHeader><CardContent className="space-y-2 pt-5">{record.attachments.length ? record.attachments.map((attachment) => <div className="rounded-lg border p-3 text-sm" key={attachment.id}><p className="font-medium">{attachment.filename}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.mime_type} · {attachment.size_bytes} bytes · {attachment.storage_status}</p></div>) : <p className="text-sm text-muted-foreground">No attachment metadata.</p>}</CardContent></Card><Card><CardHeader className="border-b"><CardTitle>Requested Gmail actions</CardTitle></CardHeader><CardContent className="space-y-2 pt-5">{record.actions.length ? record.actions.map((action) => <div className="flex justify-between text-sm" key={action.id}><span>{action.action_type.replace("_", " ")}</span><Badge variant="outline">{action.status}</Badge></div>) : <p className="text-sm text-muted-foreground">No provider action requested.</p>}</CardContent></Card></div></div>
    </div>
  )
}
