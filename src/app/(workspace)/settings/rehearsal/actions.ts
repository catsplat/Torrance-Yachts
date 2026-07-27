"use server"

import { revalidatePath } from "next/cache"

import { generateEmailSuggestion } from "@/lib/ai/service"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  createOfflineRehearsalEmail,
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
  const { data: message, error: messageError } = await context.supabase
    .from("email_messages")
    .select("thread_id")
    .eq("id", messageId)
    .single()
  if (messageError) throw new Error("The synthetic email could not be labelled as a rehearsal record.")
  const registrations = await Promise.all([
    context.supabase.rpc("register_rehearsal_record", {
      p_entity_id: messageId,
      p_entity_type: "email_message",
      p_rehearsal_run_id: runId,
    }),
    context.supabase.rpc("register_rehearsal_record", {
      p_entity_id: message.thread_id,
      p_entity_type: "email_thread",
      p_rehearsal_run_id: runId,
    }),
  ])
  if (registrations.some((result) => result.error)) {
    throw new Error("The synthetic email could not be labelled as a rehearsal record.")
  }
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
  let runId = typeof submittedRunId === "string" && submittedRunId
    ? submittedRunId
    : ""
  if (!runId) {
    const { data, error } = await context.supabase.rpc("create_rehearsal_run", {
      p_label: "Offline email rehearsal: " + kind,
    })
    if (error || !data) return { message: "The fictional rehearsal run could not be started." }
    runId = data
  }
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

  const { data: runId, error: runError } = await context.supabase.rpc("create_rehearsal_run", {
    p_label: "Five-route fictional workflow rehearsal",
  })
  if (runError || !runId) return { message: "The fictional rehearsal run could not be started." }
  const primaryThread = `offline-rehearsal-thread-${runId}`
  try {
    const newEnquiry = await ingestFixture("new_enquiry", context, runId, primaryThread)
    const { data: yachtId, error: yachtError } = await context.supabase.rpc(
      "create_rehearsal_fixture_yacht",
      { p_rehearsal_run_id: runId },
    )
    if (yachtError || !yachtId) throw new Error("Synthetic yacht fixture is unavailable.")
    const { data: enquiryId, error: classifyError } = await context.supabase.rpc("classify_email_message_with_details", {
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
      p_requested_yacht_id: yachtId,
    })
    if (classifyError) throw new Error("Synthetic enquiry could not be linked.")
    if (enquiryId) {
      const { error: enquiryRegistrationError } = await context.supabase.rpc(
        "register_rehearsal_record",
        {
          p_entity_id: enquiryId,
          p_entity_type: "enquiry",
          p_rehearsal_run_id: runId,
        },
      )
      if (enquiryRegistrationError) {
        throw new Error("Synthetic enquiry could not be labelled as a rehearsal record.")
      }
      const { data: enquiry } = await context.supabase
        .from("enquiries")
        .select("customer_contact_id")
        .eq("id", enquiryId)
        .single()
      if (enquiry?.customer_contact_id) {
        const { error: contactRegistrationError } = await context.supabase.rpc(
          "register_rehearsal_record",
          {
            p_entity_id: enquiry.customer_contact_id,
            p_entity_type: "contact",
            p_rehearsal_run_id: runId,
          },
        )
        if (contactRegistrationError) {
          throw new Error("Synthetic contact could not be labelled as a rehearsal record.")
        }
      }
    }
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

export async function resetOfflineRehearsalAction(
  _state: OfflineRehearsalActionState,
  formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") {
    return { message: "Administrator access is required." }
  }
  if (!offlineRehearsalEnabled()) {
    return { message: "Offline rehearsal is available only in local development." }
  }
  const runId = formData.get("runId")
  if (typeof runId !== "string" || !runId) return { message: "Choose a fictional rehearsal run to remove." }

  const { error } = await context.supabase.rpc("reset_rehearsal_run", {
    p_reason: "Administrator removed the completed fictional rehearsal run.",
    p_rehearsal_run_id: runId,
  })
  if (error) {
    return {
      message: "This run cannot be reset yet because it contains a later fictional workflow record. Use the full workflow reset once that scenario is complete.",
    }
  }
  refreshRehearsalPaths()
  return { message: "The fictional run was removed. Its reset audit evidence remains.", success: true }
}
