import { NextResponse } from "next/server"

import { generatePendingEmailSuggestionBatch } from "@/lib/ai/service"
import { reconcileConfiguredGmailMailbox } from "@/lib/emails/gmail-reconciliation"
import { dispatchPendingImapProviderActions, reconcileConfiguredImapMailboxes } from "@/lib/emails/imap-reconciliation"
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
    let imapResult: Awaited<ReturnType<typeof reconcileConfiguredImapMailboxes>> | null = null
    let imapError = false
    let imapActionsResult: Awaited<ReturnType<typeof dispatchPendingImapProviderActions>> | null = null
    try {
      imapResult = await reconcileConfiguredImapMailboxes()
    } catch {
      imapError = true
    }
    try {
      imapActionsResult = await dispatchPendingImapProviderActions()
    } catch {
      imapError = true
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
      gmail_reconciliation_failed: gmailError || Boolean(gmailResult?.failed),
      gmail_recovery_used: gmailResult?.recovered ?? false,
      imap_configured: imapResult?.configured ?? imapError,
      imap_messages_processed: imapResult?.processed ?? 0,
      imap_provider_actions_completed: imapActionsResult?.completed ?? 0,
      imap_provider_actions_failed: imapActionsResult?.failed ?? 0,
      imap_reconciliation_failed: imapError,
    })
  } catch {
    return NextResponse.json({ error: "Automation is not configured" }, { status: 503 })
  }
}
