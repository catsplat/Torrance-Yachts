"use server"

import { revalidatePath } from "next/cache"

import { generateEmailSuggestion } from "@/lib/ai/service"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  createOfflineRehearsalEmail,
  createOfflineRehearsalRunId,
  type OfflineEmailKind,
  offlineRehearsalEnabled,
} from "@/lib/rehearsal/offline-email"
import { createAdminClient } from "@/lib/supabase/admin"

export type OfflineRehearsalActionState = {
  fixtureKind?: OfflineEmailKind
  message?: string
  messageId?: string
  runId?: string
  success?: boolean
}

const fixtureKinds = new Set<OfflineEmailKind>([
  "new_enquiry",
  "enquiry_follow_up",
  "internal",
  "circular",
  "unknown",
])

function parseFixtureKind(value: FormDataEntryValue | null): OfflineEmailKind {
  return typeof value === "string" && fixtureKinds.has(value as OfflineEmailKind)
    ? value as OfflineEmailKind
    : "new_enquiry"
}

async function ingestFixture(
  kind: OfflineEmailKind,
  context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestContext>>>,
  runId: string,
  threadId?: string,
) {
  const settings = await context.supabase
    .from("operational_settings")
    .select("internal_email_domains")
    .single()
  const email = createOfflineRehearsalEmail(kind, {
    internalDomain: settings.data?.internal_email_domains[0] ?? "example.test",
    runId,
    threadId,
  })
  const admin = createAdminClient()
  const { data: messageId, error } = await admin.rpc("ingest_gmail_message", {
    p_attachments: email.attachments,
    p_body_text: email.body_text,
    p_cc_emails: email.cc_emails,
    p_gmail_label_ids: email.gmail_label_ids,
    p_has_attachments: email.has_attachments,
    p_has_list_id: email.has_list_id,
    p_has_list_unsubscribe: email.has_list_unsubscribe,
    p_internet_message_id: email.internet_message_id,
    p_is_bulk: email.is_bulk,
    p_provider_event_id: email.provider_event_id,
    p_provider_message_id: email.provider_message_id,
    p_provider_thread_id: email.provider_thread_id,
    p_received_at: email.received_at,
    p_recipient_emails: email.recipient_emails,
    p_sender_email: email.sender_email,
    p_sender_name: email.sender_name,
    p_snippet: email.snippet,
    p_subject: email.subject,
  })
  if (error || !messageId) throw new Error("The synthetic email could not enter the local inbox.")
  return { email, messageId }
}

function refreshRehearsalPaths() {
  revalidatePath("/")
  revalidatePath("/emails")
  revalidatePath("/enquiries")
  revalidatePath("/settings/rehearsal")
}

export async function createOfflineRehearsalEmailAction(
  _state: OfflineRehearsalActionState,
  formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") {
    return { message: "Administrator access is required." }
  }
  if (!offlineRehearsalEnabled()) {
    return { message: "Offline rehearsal is available only in the local development environment." }
  }

  const kind = parseFixtureKind(formData.get("fixtureKind"))
  const submittedRunId = formData.get("runId")
  const runId = typeof submittedRunId === "string" && submittedRunId
    ? submittedRunId
    : createOfflineRehearsalRunId()
  let messageId: string
  try {
    messageId = (await ingestFixture(kind, context, runId)).messageId
  } catch {
    return { message: "The synthetic email could not enter the local inbox." }
  }

  try {
    await generateEmailSuggestion(context, messageId, `offline-rehearsal:${kind}:${runId}`)
  } catch {
    refreshRehearsalPaths()
    return {
      fixtureKind: kind,
      message: "Synthetic email entered the real Inbox, but AI analysis did not complete. Open it to inspect the recorded failure or retry analysis.",
      messageId,
      runId,
      success: true,
    }
  }

  refreshRehearsalPaths()
  return {
    fixtureKind: kind,
    message: "Synthetic email entered the real Inbox and received an AI proposal. Review it exactly as a staff member would.",
    messageId,
    runId,
    success: true,
  }
}

export async function createOfflineRehearsalSuiteAction(
  _state: OfflineRehearsalActionState,
  _formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") return { message: "Administrator access is required." }
  if (!offlineRehearsalEnabled()) return { message: "Offline rehearsal is available only in local development." }

  const settingsResult = await context.supabase
    .from("operational_settings")
    .select("internal_email_domains, enquiry_timeout_enabled, negotiating_timeout_days, new_enquiry_timeout_days, offer_sent_timeout_days, waiting_reply_timeout_days")
    .single()
  if (settingsResult.error || !settingsResult.data) return { message: "Local operational settings could not be loaded." }
  const domains = settingsResult.data.internal_email_domains.includes("example.test")
    ? settingsResult.data.internal_email_domains
    : [...settingsResult.data.internal_email_domains, "example.test"]
  const { error: settingsError } = await context.supabase.rpc("update_operational_settings", {
    p_enquiry_timeout_enabled: settingsResult.data.enquiry_timeout_enabled,
    p_internal_email_domains: domains,
    p_negotiating_timeout_days: settingsResult.data.negotiating_timeout_days,
    p_new_enquiry_timeout_days: settingsResult.data.new_enquiry_timeout_days,
    p_offer_sent_timeout_days: settingsResult.data.offer_sent_timeout_days,
    p_waiting_reply_timeout_days: settingsResult.data.waiting_reply_timeout_days,
  })
  if (settingsError) return { message: "The local internal-domain fixture setting could not be applied." }

  const runId = createOfflineRehearsalRunId()
  const primaryThread = `offline-rehearsal-thread-${runId}`
  try {
    const newEnquiry = await ingestFixture("new_enquiry", context, runId, primaryThread)
    const yacht = await context.supabase.from("yachts").select("id").eq("name", "M/Y Asteria").maybeSingle()
    if (yacht.error || !yacht.data) throw new Error("Synthetic yacht is unavailable.")
    const { error: classifyError } = await context.supabase.rpc("classify_email_message_with_details", {
      p_budget_amount: 180000,
      p_charter_end_date: "2026-08-21",
      p_charter_start_date: "2026-08-14",
      p_classification: "new_enquiry",
      p_contact_id: undefined,
      p_currency: "EUR",
      p_disembarkation_port: "Athens",
      p_embarkation_port: "Athens",
      p_enquiry_id: undefined,
      p_enquiry_summary: "OFFLINE REHEARSAL: family charter enquiry for M/Y Asteria.",
      p_guest_count: 10,
      p_message_id: newEnquiry.messageId,
      p_reason: "Administrator started the fictional local follow-up-routing rehearsal.",
      p_requested_yacht_id: yacht.data.id,
    })
    if (classifyError) throw new Error("Synthetic enquiry could not be linked.")
    await Promise.all([
      ingestFixture("enquiry_follow_up", context, runId, primaryThread),
      ingestFixture("internal", context, runId),
      ingestFixture("circular", context, runId),
      ingestFixture("unknown", context, runId),
    ])
    refreshRehearsalPaths()
    return {
      fixtureKind: "new_enquiry",
      message: "Five fictional email routes were created. The linked enquiry exists only to prove follow-up routing; open the new enquiry email to run the AI review manually.",
      messageId: newEnquiry.messageId,
      runId,
      success: true,
    }
  } catch {
    return { message: "The fictional email suite could not be created. No external service was contacted." }
  }
}
