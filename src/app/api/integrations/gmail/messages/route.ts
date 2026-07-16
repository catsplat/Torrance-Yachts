import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { gmailIngestionSchema } from "@/lib/emails/validation"
import { createAdminClient } from "@/lib/supabase/admin"

function validBearerToken(request: Request) {
  const configured = process.env.EMAIL_INGESTION_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!configured || !supplied) return false
  const expectedBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
}
export async function POST(request: Request) {
  if (!validBearerToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = gmailIngestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Gmail message payload", issues: parsed.error.issues.length },
      { status: 422 },
    )
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("ingest_gmail_message", {
      p_attachments: parsed.data.attachments,
      p_body_text: parsed.data.body_text,
      p_cc_emails: parsed.data.cc_emails,
      p_gmail_label_ids: parsed.data.gmail_label_ids,
      p_has_attachments: parsed.data.has_attachments,
      p_has_list_id: parsed.data.has_list_id,
      p_has_list_unsubscribe: parsed.data.has_list_unsubscribe,
      p_internet_message_id: parsed.data.internet_message_id,
      p_is_bulk: parsed.data.is_bulk,
      p_provider_event_id: parsed.data.provider_event_id,
      p_provider_message_id: parsed.data.provider_message_id,
      p_provider_thread_id: parsed.data.provider_thread_id,
      p_received_at: parsed.data.received_at,
      p_recipient_emails: parsed.data.recipient_emails,
      p_sender_email: parsed.data.sender_email,
      p_sender_name: parsed.data.sender_name,
      p_snippet: parsed.data.snippet,
      p_subject: parsed.data.subject,
    })
    if (error || !data) {
      return NextResponse.json({ error: "Ingestion failed" }, { status: 500 })
    }
    return NextResponse.json({ messageId: data }, { status: 202 })
  } catch {
    return NextResponse.json({ error: "Integration is not configured" }, { status: 503 })
  }
}
