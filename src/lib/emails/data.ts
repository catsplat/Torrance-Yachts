import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export const getEmailInbox = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("email_messages").select(`
    id, thread_id, provider_message_id, received_at, sender_name, sender_email,
    subject, snippet, has_attachments, classification, processing_status,
    deterministic_rule,
    thread:email_threads!email_messages_thread_id_fkey(
      enquiry_id,
      enquiry:enquiries!email_threads_enquiry_id_fkey(reference, summary)
    )
  `).order("received_at", { ascending: false }).limit(1000)
  if (error) throw new Error("Unable to load the email inbox.")
  return data
})

export async function getEmailMessageDetail(id: string) {
  const supabase = await createClient()
  const [messageResult, attachmentsResult, historyResult, actionsResult, contactsResult, enquiriesResult] =
    await Promise.all([
      supabase.from("email_messages").select(`
        *,
        thread:email_threads!email_messages_thread_id_fkey(
          id, provider_thread_id, enquiry_id, subject, message_count,
          enquiry:enquiries!email_threads_enquiry_id_fkey(id, reference, summary)
        )
      `).eq("id", id).single(),
      supabase.from("email_attachments").select("*").eq("message_id", id).order("filename"),
      supabase.from("email_classification_history").select(
        "*, actor:profiles!email_classification_history_changed_by_fkey(display_name)",
      ).eq("message_id", id).order("created_at", { ascending: false }),
      supabase.from("email_provider_actions").select("*").eq("message_id", id).order("created_at"),
      supabase.from("contacts").select("id, full_name, email, roles").eq("active", true).order("full_name"),
      supabase.from("enquiries").select("id, reference, summary, status")
        .in("status", [
          "new", "waiting_for_reply", "offer_sent", "negotiating",
          "contract_issued", "awaiting_signatures", "booked", "charter_active",
        ])
        .order("updated_at", { ascending: false }).limit(500),
    ])
  if (
    messageResult.error || attachmentsResult.error || historyResult.error ||
    actionsResult.error || contactsResult.error || enquiriesResult.error
  ) throw new Error("Unable to load the email review record.")
  return {
    actions: actionsResult.data,
    attachments: attachmentsResult.data,
    contacts: contactsResult.data,
    enquiries: enquiriesResult.data,
    history: historyResult.data,
    message: messageResult.data,
  }
}

export const getOperationalSettings = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("operational_settings").select("*").single()
  if (error) throw new Error("Unable to load operational settings.")
  return data
})
