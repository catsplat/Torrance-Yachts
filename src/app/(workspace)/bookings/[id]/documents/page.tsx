import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ContractApprovalForm,
  ContractReviewForm,
  DocumentReviewForm,
  DocumentUploadForm,
  PaymentPaidForm,
  RequirementWaiverForm,
} from "@/components/documents/document-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { formatBookingDate, formatBookingMoney } from "@/lib/bookings/options"
import { getBookingDocumentWorkspace } from "@/lib/documents/data"
import { documentTypeLabels } from "@/lib/documents/options"

type Props = { params: Promise<{ id: string }> }

export default async function BookingDocumentsPage({ params }: Props) {
  const { id } = await params
  const [workspace, user] = await Promise.all([
    getBookingDocumentWorkspace(id).catch(() => null),
    getCurrentUser(),
  ])
  if (!workspace) notFound()
  const verifiedAgreement = workspace.documents.find((document) =>
    document.document_type === "charter_agreement" && document.verification_status === "verified"
  )
  const draftReview = workspace.reviews.find((review) => review.status === "draft")
  const approvedReview = workspace.reviews.find((review) => review.status === "approved")

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href={`/bookings/${id}`}><ArrowLeft className="size-4" />Back to booking</Link>
      <div><p className="font-mono text-xs font-semibold text-primary">{workspace.booking.reference}</p><h1 className="mt-1 text-3xl font-semibold">Documents, contract and payments</h1><p className="mt-2 text-sm text-muted-foreground">{workspace.booking.yacht.name} · {formatBookingDate(workspace.booking.charter_start_date)} – {formatBookingDate(workspace.booking.charter_end_date)}</p></div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Document requirements</CardTitle><CardDescription>The checklist is generated automatically for every confirmed booking.</CardDescription></CardHeader>
        <CardContent className="divide-y p-0">{workspace.requirements.map((requirement) => (
          <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(18rem,.8fr)]" key={requirement.id}>
            <div><p className="font-medium">{documentTypeLabels[requirement.document_type]}</p><p className="mt-1 text-xs text-muted-foreground">{requirement.required ? "Required" : "Optional"}{requirement.waiver_reason ? ` · ${requirement.waiver_reason}` : ""}</p></div>
            <div><Badge variant={requirement.status === "verified" ? "default" : "outline"}>{requirement.status}</Badge></div>
            <div className="space-y-3">{requirement.status === "missing" ? <><DocumentUploadForm bookingId={id} suggestedType={requirement.document_type} />{!requirement.required && user?.role === "administrator" ? <RequirementWaiverForm bookingId={id} requirementId={requirement.id} /> : null}</> : requirement.status === "uploaded" ? <p className="text-sm text-muted-foreground">Awaiting human verification below.</p> : null}</div>
          </div>
        ))}</CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>Uploaded private files</CardTitle><CardDescription>Links expire after five minutes. Review the actual file before verifying it.</CardDescription></CardHeader>
        <CardContent className="divide-y p-0">{workspace.documents.length ? workspace.documents.map((document) => (
          <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(18rem,.8fr)]" key={document.id}>
            <div><p className="font-medium">{document.title} <span className="text-xs text-muted-foreground">v{document.version_number}</span></p><p className="mt-1 text-sm text-muted-foreground">{document.original_filename} · {document.retention_class.replace("_", " ")}</p>{document.signedUrl ? <a className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline" href={document.signedUrl} rel="noreferrer" target="_blank">Open private file <ExternalLink className="size-3" /></a> : <p className="mt-2 text-xs text-destructive">Temporary link unavailable.</p>}</div>
            <div><Badge variant={document.verification_status === "verified" ? "default" : "outline"}>{document.verification_status.replace("_", " ")}</Badge></div>
            <div>{document.verification_status === "pending_review" ? <DocumentReviewForm bookingId={id} documentId={document.id} /> : <p className="text-sm text-muted-foreground">{document.verification_notes}</p>}</div>
          </div>
        )) : <p className="p-5 text-sm text-muted-foreground">No files uploaded.</p>}</CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Human-reviewed contract fields</CardTitle><CardDescription>No AI output can create payment obligations. A verified agreement and explicit approval are required.</CardDescription></CardHeader>
        <CardContent className="space-y-5 pt-5">
          {verifiedAgreement ? <ContractReviewForm booking={workspace.booking} sourceDocumentId={verifiedAgreement.id} /> : <p className="text-sm text-muted-foreground">Upload and verify the signed charter agreement before recording contract fields.</p>}
          {draftReview ? <div className="border-t pt-5"><p className="mb-3 font-medium">Approve payment schedule for {formatBookingMoney(draftReview.charter_fee, draftReview.currency)}</p><ContractApprovalForm bookingId={id} reviewId={draftReview.id} /></div> : null}
          {approvedReview ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="size-4" />Approved contract review recorded. New edits create another reviewed draft.</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader className="border-b"><CardTitle>Payment schedule</CardTitle></CardHeader><CardContent className="divide-y p-0">{workspace.payments.length ? workspace.payments.map((payment) => <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]" key={payment.id}><div><p className="font-medium">Instalment {payment.instalment_number} · {formatBookingMoney(payment.amount, payment.currency)}</p><p className="mt-1 text-sm text-muted-foreground">Due {formatBookingDate(payment.due_date)} · {payment.status}</p></div>{payment.status === "scheduled" ? <PaymentPaidForm bookingId={id} paymentId={payment.id} /> : <Badge>Paid</Badge>}</div>) : <p className="p-5 text-sm text-muted-foreground">Approve reviewed contract data to create payments.</p>}</CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Deterministic commission</CardTitle></CardHeader><CardContent className="pt-5">{workspace.commission ? <div><p className="text-3xl font-semibold">{formatBookingMoney(workspace.commission.amount, workspace.commission.currency)}</p><p className="mt-2 text-sm text-muted-foreground">{workspace.commission.rate}% of {formatBookingMoney(workspace.commission.basis_amount, workspace.commission.currency)} · {workspace.commission.calculation_version}</p></div> : <p className="text-sm text-muted-foreground">Created only when reviewed contract data is approved.</p>}</CardContent></Card>
      </div>
    </div>
  )
}
