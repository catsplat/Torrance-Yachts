import "server-only"

import { cache } from "react"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

export const emailInboxPageSize = 50

const emailInboxCursorSchema = z.object({
  id: z.uuid(),
  receivedAt: z.iso.datetime(),
})

export type EmailInboxFilters = {
  classification?: Enums<"email_classification">
  cursor?: string
  query?: string
}

function decodeEmailInboxCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return emailInboxCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

function encodeEmailInboxCursor(cursor: z.infer<typeof emailInboxCursorSchema>) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

export async function getEmailInboxPage(filters: EmailInboxFilters) {
  const cursor = decodeEmailInboxCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data: page, error: pageError }, { data: totalCount, error: countError }, {
    data: reviewCount,
    error: reviewError,
  }] = await Promise.all([
    supabase.rpc("list_email_inbox_page", {
      p_classification: filters.classification,
      p_cursor_id: cursor?.id,
      p_cursor_received_at: cursor?.receivedAt,
      p_limit: emailInboxPageSize + 1,
      p_query: filters.query,
    }),
    supabase.rpc("count_email_inbox", {
      p_classification: filters.classification,
      p_query: filters.query,
    }),
    supabase.rpc("count_email_inbox_review_required"),
  ])
  if (pageError || countError || reviewError) {
    throw new Error("Unable to load the complete email inbox.")
  }

  const hasNextPage = page.length > emailInboxPageSize
  const messages = page.slice(0, emailInboxPageSize)
  const last = messages.at(-1)
  return {
    messages,
    nextCursor: hasNextPage && last
      ? encodeEmailInboxCursor({ id: last.id, receivedAt: last.received_at })
      : null,
    reviewCount: reviewCount ?? 0,
    totalCount: totalCount ?? 0,
  }
}

export async function getEmailMessageDetail(id: string) {
  const supabase = await createClient()
  const [messageResult, attachmentsResult, historyResult, actionsResult, contactsResult, yachtsResult] =
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
      supabase.from("yachts").select("id, name").eq("status", "active").order("name"),
    ])
  if (
    messageResult.error || attachmentsResult.error || historyResult.error ||
    actionsResult.error || contactsResult.error || yachtsResult.error
  ) throw new Error("Unable to load the email review record.")
  return {
    actions: actionsResult.data,
    attachments: attachmentsResult.data,
    contacts: contactsResult.data,
    history: historyResult.data,
    message: messageResult.data,
    yachts: yachtsResult.data,
  }
}

export const getOperationalSettings = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("operational_settings").select("*").single()
  if (error) throw new Error("Unable to load operational settings.")
  return data
})
