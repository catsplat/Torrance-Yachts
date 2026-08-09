import "server-only"

import { reconcileGoogleGmail } from "@/lib/emails/google-gmail"
import { ingestGmailMessage } from "@/lib/emails/ingestion"
import type { GoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace"
import { createAdminClient } from "@/lib/supabase/admin"

export async function reconcileConfiguredGmailMailbox() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_active_gmail_ingestion_credentials")
  if (error) throw new Error("The configured Gmail inbox could not be loaded.")
  const selected = data?.[0]
  if (!selected) return { configured: false, initialized: false, processed: 0, recovered: false }

  const credentials: GoogleWorkspaceCredentials = {
    account_email: selected.account_email,
    client_id: selected.client_id,
    client_secret: selected.client_secret,
    refresh_token: selected.refresh_token,
    scopes: selected.scopes,
  }
  const now = new Date().toISOString()
  try {
    const result = await reconcileGoogleGmail({
      credentials,
      ingest: ingestGmailMessage,
      lastHistoryId: selected.last_history_id,
    })
    const completion = await supabase.rpc("complete_gmail_reconciliation", {
      p_history_id: result.historyId,
      p_synced_at: now,
      p_user_id: selected.user_id,
    })
    if (completion.error) throw new Error("Gmail sync progress could not be recorded.")
    return { configured: true, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Gmail reconciliation failed."
    await supabase.rpc("fail_gmail_reconciliation", {
      p_error: message,
      p_failed_at: now,
      p_user_id: selected.user_id,
    })
    throw error
  }
}

