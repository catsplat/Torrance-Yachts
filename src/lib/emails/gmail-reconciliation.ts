import "server-only"

import { reconcileGoogleGmail } from "@/lib/emails/google-gmail"
import { ingestGmailMessage } from "@/lib/emails/ingestion"
import type { GoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace"
import { createAdminClient } from "@/lib/supabase/admin"
import { GoogleOAuthError } from "@/lib/integrations/google-workspace"

export async function reconcileConfiguredGmailMailbox() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_active_gmail_ingestion_credentials")
  if (error) throw new Error("The configured Gmail inbox could not be loaded.")
  const summary = { configured: Boolean(data?.length), initialized: false, processed: 0, recovered: false, failed: 0 }
  // The database leases at most two owner-bound mailboxes, oldest first.
  for (const selected of data ?? []) {

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
      ingest: (payload) => ingestGmailMessage(payload, selected.user_id),
      lastHistoryId: selected.last_history_id,
    })
    const completion = await supabase.rpc("complete_gmail_reconciliation", {
      p_history_id: result.historyId,
      p_synced_at: now,
      p_user_id: selected.user_id,
    })
    if (completion.error) throw new Error("Gmail sync progress could not be recorded.")
    await supabase.rpc("record_google_oauth_health", {
      p_requires_reauthentication: false,
      p_succeeded: true,
      p_user_id: selected.user_id,
    })
    summary.initialized ||= result.initialized
    summary.recovered ||= result.recovered
    summary.processed += result.processed
  } catch (error) {
    const message = "Gmail reconciliation failed. Reconnect if access was revoked, otherwise retry."
    await supabase.rpc("fail_gmail_reconciliation", {
      p_error: message,
      p_failed_at: now,
      p_user_id: selected.user_id,
    })
    if (error instanceof GoogleOAuthError && error.requiresReauthentication) {
      await supabase.rpc("record_google_oauth_health", {
        p_error: "Google access expired or was revoked.",
        p_requires_reauthentication: true,
        p_succeeded: false,
        p_user_id: selected.user_id,
      })
    }
    summary.failed += 1
  }
  }
  return summary
}
