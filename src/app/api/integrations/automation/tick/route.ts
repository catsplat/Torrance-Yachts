import { NextResponse } from "next/server"

import { generatePendingEmailSuggestionBatch } from "@/lib/ai/service"
import { reconcileConfiguredGmailMailbox } from "@/lib/emails/gmail-reconciliation"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { consumeRateLimit } from "@/lib/security/rate-limit"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!await consumeRateLimit("automation_tick", 120, 60)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }
  try {
    let gmailResult: Awaited<ReturnType<typeof reconcileConfiguredGmailMailbox>> | null = null
    let gmailError = false
    try {
      gmailResult = await reconcileConfiguredGmailMailbox()
    } catch {
      gmailError = true
    }
    let aiResult: Awaited<ReturnType<typeof generatePendingEmailSuggestionBatch>> | null = null
    let aiError = false
    try {
      aiResult = await generatePendingEmailSuggestionBatch()
    } catch {
      aiError = true
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("run_automation_tick", {
      p_as_of: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: "Automation tick failed" }, { status: 500 })
    const summary = data && typeof data === "object" && !Array.isArray(data) ? data : {}
    return NextResponse.json({
      ...summary,
      ai_email_processed: aiResult?.completed ?? 0,
      ai_email_failed: aiResult?.failed ?? 0,
      ai_processing_timed_out: aiResult?.timedOut ?? false,
      ai_processing_failed: aiError,
      gmail_configured: gmailResult?.configured ?? gmailError,
      gmail_cursor_initialized: gmailResult?.initialized ?? false,
      gmail_messages_processed: gmailResult?.processed ?? 0,
      gmail_reconciliation_failed: gmailError,
      gmail_recovery_used: gmailResult?.recovered ?? false,
    })
  } catch {
    return NextResponse.json({ error: "Automation is not configured" }, { status: 503 })
  }
}
