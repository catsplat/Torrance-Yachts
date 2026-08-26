import "server-only"

import { applyImapMailboxAction, reconcileImapMailbox } from "@/lib/emails/imap"
import { createAdminClient } from "@/lib/supabase/admin"

type ImapCredentialRow = {
  account_email: string
  app_password: string
  connection_id: string
  folders: string[]
  host: string
  port: number
  tls: boolean
  user_id: string
}

type ImapProviderAction = ImapCredentialRow & {
  action_id: string
  action_type: "archive" | "mark_read"
  connection_id: string
  folder: string
  uid: number
}

export async function dispatchPendingImapProviderActions() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_pending_imap_provider_actions")
  if (error) throw new Error("IMAP mailbox actions could not be loaded.")
  let completed = 0
  let failed = 0
  for (const action of (data ?? []) as ImapProviderAction[]) {
    try {
      await applyImapMailboxAction({
        action: action.action_type,
        credentials: {
          accountEmail: action.account_email,
          appPassword: action.app_password,
          host: action.host,
          port: action.port,
          tls: action.tls,
        },
        folder: action.folder,
        uid: action.uid,
      })
      const result = await supabase.rpc("complete_imap_provider_action", { p_action_id: action.action_id })
      if (result.error || !result.data) throw new Error("IMAP action completion could not be recorded.")
      completed += 1
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "IMAP mailbox action failed."
      const result = await supabase.rpc("fail_imap_provider_action", { p_action_id: action.action_id, p_error: message.slice(0, 2000) })
      if (!result.error) failed += 1
    }
  }
  return { completed, failed }
}

export async function reconcileConfiguredImapMailboxes() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_enabled_imap_mailbox_credentials")
  if (error) throw new Error("Configured IMAP mailboxes could not be loaded.")
  const mailboxes = (data ?? []) as ImapCredentialRow[]
  let processed = 0
  for (const mailbox of mailboxes.slice(0, 5)) {
    try {
      const { data: states, error: statesError } = await supabase
        .from("imap_mailbox_folder_sync_states")
        .select("folder,last_uid,last_uid_validity")
        .eq("connection_id", mailbox.connection_id)
      if (statesError) throw new Error("IMAP sync state could not be loaded.")
      const byFolder = new Map(states.map((state) => [state.folder, state]))
      for (const folder of mailbox.folders.slice(0, 12)) {
        const state = byFolder.get(folder)
        const result = await reconcileImapMailbox({
          connectionId: mailbox.connection_id,
          credentials: {
            accountEmail: mailbox.account_email,
            appPassword: mailbox.app_password,
            host: mailbox.host,
            port: mailbox.port,
            tls: mailbox.tls,
          },
          folder,
          ingest: async (message) => {
            const { error: ingestError } = await supabase.rpc("ingest_imap_message_for_owner", {
              p_attachments: message.attachments,
              p_body_text: message.body_text,
              p_cc_emails: message.cc_emails,
              p_folder_flags: message.gmail_label_ids,
              p_has_attachments: message.has_attachments,
              p_has_list_id: message.has_list_id,
              p_has_list_unsubscribe: message.has_list_unsubscribe,
              p_internet_message_id: message.internet_message_id,
              p_is_bulk: message.is_bulk,
              p_owner_user_id: mailbox.user_id,
              p_provider_event_id: message.provider_event_id,
              p_provider_message_id: message.provider_message_id,
              p_provider_thread_id: message.provider_thread_id,
              p_received_at: message.received_at,
              p_recipient_emails: message.recipient_emails,
              p_sender_email: message.sender_email,
              p_sender_name: message.sender_name,
              p_snippet: message.snippet,
              p_subject: message.subject,
            })
            if (ingestError) throw new Error("IMAP message ingestion failed.")
          },
          lastUid: state?.last_uid ?? null,
          lastUidValidity: state?.last_uid_validity ?? null,
        })
        const { error: completionError } = await supabase.rpc("complete_imap_reconciliation", {
          p_connection_id: mailbox.connection_id,
          p_folder: folder,
          p_last_uid: result.lastUid,
          p_synced_at: new Date().toISOString(),
          p_uid_validity: result.uidValidity,
        })
        if (completionError) throw new Error("IMAP sync progress could not be recorded.")
        processed += result.processed
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "IMAP reconciliation failed."
      await supabase.rpc("fail_imap_reconciliation", {
        p_connection_id: mailbox.connection_id,
        p_error: message.slice(0, 500),
        p_failed_at: new Date().toISOString(),
      })
    }
  }
  return { configured: mailboxes.length > 0, processed }
}
