import "server-only"

import type { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

import type { gmailIngestionSchema } from "./validation"

export async function ingestGmailMessage(
  payload: z.infer<typeof gmailIngestionSchema>,
  ownerUserId: string,
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("ingest_gmail_message_for_owner", {
    p_attachments: payload.attachments,
    p_body_text: payload.body_text,
    p_cc_emails: payload.cc_emails,
    p_gmail_label_ids: payload.gmail_label_ids,
    p_has_attachments: payload.has_attachments,
    p_has_list_id: payload.has_list_id,
    p_has_list_unsubscribe: payload.has_list_unsubscribe,
    p_internet_message_id: payload.internet_message_id,
    p_is_bulk: payload.is_bulk,
    p_owner_user_id: ownerUserId,
    p_provider_event_id: payload.provider_event_id,
    p_provider_message_id: payload.provider_message_id,
    p_provider_thread_id: payload.provider_thread_id,
    p_received_at: payload.received_at,
    p_recipient_emails: payload.recipient_emails,
    p_sender_email: payload.sender_email,
    p_sender_name: payload.sender_name,
    p_snippet: payload.snippet,
    p_subject: payload.subject,
  })
  if (error || !data) throw new Error("Gmail ingestion failed.")
  return data
}
