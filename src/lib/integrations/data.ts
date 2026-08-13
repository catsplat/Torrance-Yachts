import "server-only"

import { cache } from "react"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export const integrationDeliveryPageSize = 50
const deliveryCursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() })

function decodeDeliveryCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    return deliveryCursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))).data ?? null
  } catch { return null }
}

export async function getIntegrationWorkspace(filters: {
  cursor?: string
  provider?: "gmail" | "google_calendar" | "google_drive" | "google_sheets" | "telegram"
  status?: "claimed" | "delivered" | "failed" | "pending"
} = {}) {
  const cursor = decodeDeliveryCursor(filters.cursor)
  const supabase = await createClient()
  const [connections, deliveries, deliveryCount, notifications, snapshots, users, contacts] = await Promise.all([
    supabase.from("integration_connections").select("*").order("provider"),
    supabase.rpc("list_integration_delivery_page", {
      p_cursor_created_at: cursor?.createdAt, p_cursor_id: cursor?.id,
      p_limit: integrationDeliveryPageSize + 1, p_provider: filters.provider,
      p_status: filters.status,
    }),
    supabase.rpc("count_integration_deliveries", { p_provider: filters.provider, p_status: filters.status }),
    supabase.from("notifications").select(`
      *,
      recipient_user:profiles!notifications_recipient_user_id_fkey(display_name, telegram_chat_id),
      recipient_contact:contacts!notifications_recipient_contact_id_fkey(full_name, email)
    `).eq("status", "pending_approval").order("created_at", { ascending: false }).limit(50),
    supabase.from("integration_snapshots").select("id, status, row_count, requested_at, delivered_at")
      .order("requested_at", { ascending: false }).limit(20),
    supabase.rpc("list_active_notification_recipient_directory"),
    supabase.from("contacts").select("id, full_name, email")
      .eq("active", true).not("email", "is", null).order("full_name"),
  ])
  if (
    connections.error || deliveries.error || deliveryCount.error || notifications.error || snapshots.error ||
    users.error || contacts.error
  ) {
    throw new Error("Unable to load the integration workspace.")
  }
  const hasNextPage = deliveries.data.length > integrationDeliveryPageSize
  const deliveryPage = deliveries.data.slice(0, integrationDeliveryPageSize)
  const last = deliveryPage.at(-1)
  return {
    connections: connections.data,
    deliveries: deliveryPage,
    deliveryTotalCount: Number(deliveryCount.data ?? 0),
    nextDeliveryCursor: hasNextPage && last
      ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
      : null,
    notifications: notifications.data,
    snapshots: snapshots.data,
    contacts: contacts.data,
    users: users.data,
  }
}

export const getGoogleMailboxCandidates = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("list_google_mailbox_candidates")
  if (error) throw new Error("Unable to load connected Gmail inboxes.")
  return data
})

export const getGoogleWorkspaceDispatchCandidates = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("list_google_workspace_dispatch_candidates")
  if (error) throw new Error("Unable to load connected Google Workspace accounts.")
  return data
})

export async function getCalendarWorkspace(month?: string) {
  const parsedMonth = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : new Date().toISOString().slice(0, 7)
  const from = new Date(`${parsedMonth}-01T00:00:00.000Z`)
  const through = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
  const supabase = await createClient()
  const { data, error } = await supabase.from("calendar_events").select("*")
    .gte("start_at", from.toISOString()).lt("start_at", through.toISOString())
    .order("start_at")
  if (error) throw new Error("Unable to load the operational calendar.")
  return { events: data, month: parsedMonth }
}

export const getInvoiceProfiles = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("invoice_profiles").select("*")
    .order("profile_name").order("version_number", { ascending: false })
  if (error) throw new Error("Unable to load invoice profiles.")
  return data
})

export async function getInvoiceGenerationContext(
  bookingId: string,
  invoiceProfileId: string,
) {
  const supabase = await createClient()
  const [bookingResult, commissionResult, profileResult] = await Promise.all([
    supabase.from("bookings").select(`
      id, reference, charter_start_date,
      yacht:yachts!bookings_yacht_id_fkey(name)
    `).eq("id", bookingId).single(),
    supabase.from("commission_calculations").select("*")
      .eq("booking_id", bookingId).order("created_at", { ascending: false })
      .limit(1).single(),
    supabase.from("invoice_profiles").select("*")
      .eq("id", invoiceProfileId).eq("status", "approved").single(),
  ])
  if (bookingResult.error || commissionResult.error || profileResult.error) {
    throw new Error("Approved invoice source data could not be loaded.")
  }
  return {
    booking: bookingResult.data,
    commission: commissionResult.data,
    profile: profileResult.data,
  }
}
