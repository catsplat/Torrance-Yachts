import { NextResponse } from "next/server"

import { hasValidEmailIngestionToken } from "@/lib/emails/ingestion-auth"
import { ingestGmailMessage } from "@/lib/emails/ingestion"
import { gmailIngestionSchema } from "@/lib/emails/validation"
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
  const parsed = gmailIngestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Gmail message payload", issues: parsed.error.issues.length },
      { status: 422 },
    )
  }

  try {
    return NextResponse.json({ messageId: await ingestGmailMessage(parsed.data) }, { status: 202 })
  } catch {
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 })
  }
}
