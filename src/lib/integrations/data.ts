import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export const getIntegrationWorkspace = cache(async () => {
  const supabase = await createClient()
  const [connections, deliveries, notifications, snapshots, users, contacts] = await Promise.all([
    supabase.from("integration_connections").select("*").order("provider"),
    supabase.from("integration_deliveries").select("*")
      .order("created_at", { ascending: false }).limit(250),
    supabase.from("notifications").select(`
      *,
      recipient_user:profiles!notifications_recipient_user_id_fkey(display_name, telegram_chat_id),
      recipient_contact:contacts!notifications_recipient_contact_id_fkey(full_name, email)
    `).order("created_at", { ascending: false }).limit(250),
    supabase.from("integration_snapshots").select("id, status, row_count, requested_at, delivered_at")
      .order("requested_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id, display_name, email, telegram_chat_id")
      .eq("active", true).order("display_name"),
    supabase.from("contacts").select("id, full_name, email")
      .eq("active", true).not("email", "is", null).order("full_name"),
  ])
  if (
    connections.error || deliveries.error || notifications.error || snapshots.error ||
    users.error || contacts.error
  ) {
    throw new Error("Unable to load the integration workspace.")
  }
  return {
    connections: connections.data,
    deliveries: deliveries.data,
    notifications: notifications.data,
    snapshots: snapshots.data,
    contacts: contacts.data,
    users: users.data,
  }
})

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

export const getCalendarWorkspace = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from("calendar_events").select("*")
    .gte("end_at", new Date(Date.now() - 31 * 86400000).toISOString())
    .order("start_at").limit(1000)
  if (error) throw new Error("Unable to load the operational calendar.")
  return data
})

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
