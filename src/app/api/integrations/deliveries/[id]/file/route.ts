import { NextResponse } from "next/server"

import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || "document"
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const supabase = createAdminClient()
  const { data: delivery, error: deliveryError } = await supabase
    .from("integration_deliveries")
    .select("source_id, source_type, operation, status, lease_expires_at")
    .eq("id", id)
    .single()
  if (
    deliveryError || !delivery || delivery.operation !== "drive_upload" ||
    delivery.source_type !== "document" || delivery.status !== "claimed" ||
    !delivery.lease_expires_at || new Date(delivery.lease_expires_at) <= new Date()
  ) {
    return NextResponse.json({ error: "Active Drive delivery not found" }, { status: 404 })
  }
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path, original_filename, mime_type")
    .eq("id", delivery.source_id)
    .eq("verification_status", "verified")
    .single()
  if (documentError || !document) {
    return NextResponse.json({ error: "Verified document not found" }, { status: 404 })
  }
  const { data: file, error: fileError } = await supabase.storage
    .from(document.storage_bucket)
    .download(document.storage_path)
  if (fileError || !file) {
    return NextResponse.json({ error: "Private file unavailable" }, { status: 503 })
  }
  return new NextResponse(file, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${safeFilename(document.original_filename)}"`,
      "Content-Type": document.mime_type,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
