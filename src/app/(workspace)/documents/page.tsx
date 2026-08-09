import { FileCheck2, FileClock, FolderLock, Search } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { getDocumentRegisterPage } from "@/lib/documents/data"
import {
  documentScanStatusLabels,
  documentScanStatusValues,
  documentTypeLabels,
  documentTypeValues,
  documentVerificationStatusLabels,
  documentVerificationStatusValues,
} from "@/lib/documents/options"
import { cn } from "@/lib/utils"
import type { Enums } from "@/types/database"

function formatBytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`
}

type Props = {
  searchParams: Promise<{
    cursor?: string
    q?: string
    scan?: string
    type?: string
    verification?: string
  }>
}

export default async function DocumentsPage({ searchParams }: Props) {
  const filters = await searchParams
  const query = filters.q?.trim().slice(0, 160) ?? ""
  const documentType = documentTypeValues.includes(filters.type as Enums<"document_type">)
    ? filters.type as Enums<"document_type"> : undefined
  const scanStatus = documentScanStatusValues.includes(filters.scan as Enums<"document_scan_status">)
    ? filters.scan as Enums<"document_scan_status"> : undefined
  const verificationStatus = documentVerificationStatusValues.includes(filters.verification as Enums<"document_verification_status">)
    ? filters.verification as Enums<"document_verification_status"> : undefined
  const register = await getDocumentRegisterPage({
    cursor: filters.cursor,
    documentType,
    query,
    scanStatus,
    verificationStatus,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-5" data-tutorial-anchor="document-register">
      <div>
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="mt-2 text-sm text-muted-foreground">Booking and sales documents.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_11rem_11rem_auto]" method="get">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input aria-label="Search documents" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" defaultValue={query} name="q" placeholder="Document, booking or yacht" />
            </label>
            <select aria-label="Document type" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={documentType ?? ""} name="type">
              <option value="">All document types</option>
              {documentTypeValues.map((value) => <option key={value} value={value}>{documentTypeLabels[value]}</option>)}
            </select>
            <select aria-label="Scan status" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={scanStatus ?? ""} name="scan">
              <option value="">Any scan state</option>
              {documentScanStatusValues.map((value) => <option key={value} value={value}>{documentScanStatusLabels[value]}</option>)}
            </select>
            <select aria-label="Review status" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" defaultValue={verificationStatus ?? ""} name="verification">
              <option value="">Any review state</option>
              {documentVerificationStatusValues.map((value) => <option key={value} value={value}>{documentVerificationStatusLabels[value]}</option>)}
            </select>
            <button className={cn(buttonVariants({ variant: "outline" }), "h-9")} type="submit">Apply</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle>{register.totalCount} matching documents</CardTitle></CardHeader>
        <CardContent className="p-0">
          {register.documents.length ? <div className="divide-y">{register.documents.map((document) => (
            <Link className="grid gap-3 px-5 py-4 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_12rem_10rem]" href={`/bookings/${document.booking_id}/documents`} key={document.id}>
              <div className="flex gap-3">
                {document.scan_status === "released" && document.verification_status === "verified" ? <FileCheck2 className="mt-0.5 size-5 text-emerald-700" /> : <FileClock className="mt-0.5 size-5 text-amber-700" />}
                <div><p className="font-medium">{document.title}</p><p className="mt-1 text-sm text-muted-foreground">{documentTypeLabels[document.document_type]} · {document.original_filename}</p></div>
              </div>
              <div><p className="font-mono text-xs text-primary">{document.booking_reference}</p><p className="mt-1 text-sm">{document.yacht_name}</p></div>
              <div className="flex items-center justify-between gap-2"><Badge variant="outline">{document.scan_status === "released" ? documentVerificationStatusLabels[document.verification_status] : documentScanStatusLabels[document.scan_status]}</Badge><span className="text-xs text-muted-foreground">{formatBytes(document.size_bytes)}</span></div>
            </Link>
          ))}</div> : <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><FolderLock className="size-5" />No matching documents.</div>}
          <CursorPagination currentCount={register.documents.length} nextCursor={register.nextCursor} pathname="/documents" searchParams={{ cursor: filters.cursor, q: query, scan: scanStatus, type: documentType, verification: verificationStatus }} totalCount={register.totalCount} />
        </CardContent>
      </Card>
    </div>
  )
}
