import { FileCheck2, FileClock, FolderLock } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDocumentRegister } from "@/lib/documents/data"
import { documentTypeLabels } from "@/lib/documents/options"

function formatBytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  const documents = await getDocumentRegister()
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Protected records</p>
        <h1 className="mt-1 text-3xl font-semibold">Documents</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Private booking files use short-lived signed links. Identity, compliance, contract, and financial records are never public.</p>
      </div>
      <Card>
        <CardHeader className="border-b"><CardTitle>Private document register</CardTitle></CardHeader>
        <CardContent className="p-0">
          {documents.length ? <div className="divide-y">{documents.map((document) => (
            <Link className="grid gap-3 px-5 py-4 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_12rem_10rem]" href={`/bookings/${document.booking_id}/documents`} key={document.id}>
              <div className="flex gap-3">
                {document.verification_status === "verified" ? <FileCheck2 className="mt-0.5 size-5 text-emerald-700" /> : <FileClock className="mt-0.5 size-5 text-amber-700" />}
                <div><p className="font-medium">{document.title}</p><p className="mt-1 text-sm text-muted-foreground">{documentTypeLabels[document.document_type]} · {document.original_filename}</p></div>
              </div>
              <div><p className="font-mono text-xs text-primary">{document.booking.reference}</p><p className="mt-1 text-sm">{document.booking.yacht.name}</p></div>
              <div className="flex items-center justify-between gap-2"><Badge variant="outline">{document.verification_status.replace("_", " ")}</Badge><span className="text-xs text-muted-foreground">{formatBytes(document.size_bytes)}</span></div>
            </Link>
          ))}</div> : <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><FolderLock className="size-5" />Documents are uploaded from a confirmed booking.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
