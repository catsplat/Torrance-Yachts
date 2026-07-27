import { NextResponse } from "next/server"

import { hasValidEmailIngestionToken } from "@/lib/emails/ingestion-auth"
import { ingestGmailMessage } from "@/lib/emails/ingestion"
import { normaliseN8nGmailMessage } from "@/lib/emails/n8n-gmail"

export async function POST(request: Request) {
  if (!hasValidEmailIngestionToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  let payload
  try {
    payload = normaliseN8nGmailMessage(body)
  } catch {
    return NextResponse.json({ error: "Invalid n8n Gmail message" }, { status: 422 })
  }
  try {
    return NextResponse.json({ messageId: await ingestGmailMessage(payload) }, { status: 202 })
  } catch {
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 })
  }
}
