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

async function registerRehearsalRecord(
  context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestContext>>>,
  runId: string,
  entityType: "booking" | "contact" | "email_message" | "email_thread" | "enquiry" | "offer" | "task" | "yacht",
  entityId: string,
) {
  const { error } = await context.supabase.rpc("register_rehearsal_record", {
    p_entity_id: entityId,
    p_entity_type: entityType,
    p_rehearsal_run_id: runId,
  })
  if (error) throw new Error(`The fictional ${entityType.replace("_", " ")} could not be tagged.`)
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

export async function createFullCharterRehearsalAction(
  _state: OfflineRehearsalActionState,
  _formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") return { message: "Administrator access is required." }
  if (!offlineRehearsalEnabled()) return { message: "Offline rehearsal is available only in local development." }

  const { data: taskTemplate, error: taskTemplateError } = await context.supabase
    .from("task_templates")
    .select("id")
    .eq("status", "approved")
    .eq("is_default", true)
    .maybeSingle()
  if (taskTemplateError) return { message: "The approved workflow template could not be checked." }
  if (!taskTemplate) {
    return {
      message: "Approve the intended task template as the default workflow in Tasks → Task templates before creating a full rehearsal.",
    }
  }

  try {
    const { data: runId, error: runError } = await context.supabase.rpc("create_rehearsal_run", {
      p_label: "Full fictional charter rehearsal",
    })
    if (runError || !runId) throw new Error("Run creation failed.")

    const { data: fixture, error: fixtureError } = await context.supabase.rpc("configure_rehearsal_fixture_yacht", {
      p_rehearsal_run_id: runId,
    })
    const fixtureValues = fixture && typeof fixture === "object" && !Array.isArray(fixture)
      ? fixture
      : {}
    const yachtId = typeof fixtureValues.yacht_id === "string" ? fixtureValues.yacht_id : ""
    const rateId = typeof fixtureValues.rate_id === "string" ? fixtureValues.rate_id : ""
    const templateId = typeof fixtureValues.template_id === "string" ? fixtureValues.template_id : ""
    if (fixtureError || !yachtId || !rateId || !templateId) throw new Error("Fixture configuration failed.")

    const email = await ingestFixture("new_enquiry", context, runId, `full-charter-rehearsal-${runId}`)
    const { data: enquiryId, error: classificationError } = await context.supabase.rpc("classify_email_message_with_details", {
      p_budget_amount: 168000,
      p_charter_end_date: "2027-08-21",
      p_charter_start_date: "2027-08-14",
      p_classification: "new_enquiry",
      p_contact_id: undefined,
      p_currency: "EUR",
      p_disembarkation_port: "Athens",
      p_embarkation_port: "Athens",
      p_enquiry_id: undefined,
      p_enquiry_summary: "FULL REHEARSAL: fictional family charter from enquiry to post-charter follow-up.",
      p_guest_count: 10,
      p_message_id: email.messageId,
      p_reason: "Administrator created an isolated fictional full-charter rehearsal.",
      p_requested_yacht_id: yachtId,
    })
    if (classificationError || !enquiryId) throw new Error("Fictional enquiry classification failed.")
    await registerRehearsalRecord(context, runId, "enquiry", enquiryId)

    const { data: enquiry, error: enquiryError } = await context.supabase
      .from("enquiries")
      .select("customer_contact_id")
      .eq("id", enquiryId)
      .single()
    if (enquiryError || !enquiry?.customer_contact_id) throw new Error("Fictional customer record is unavailable.")
    await registerRehearsalRecord(context, runId, "contact", enquiry.customer_contact_id)

    const { data: offer, error: offerError } = await context.supabase.rpc("create_offer_draft", {
      p_body_snapshot: "This is a clearly labelled fictional local rehearsal offer. No email will be sent.",
      p_enquiry_id: enquiryId,
      p_proposed_charter_fee: 168000,
      p_rate_period_id: rateId,
      p_recipient_name: "Fictional Broker",
      p_source_offer_id: null as unknown as string,
      p_subject_snapshot: "Fictional charter rehearsal offer",
      p_template_version_id: templateId,
    })
    if (offerError || !offer) throw new Error("Fictional offer creation failed.")
    await registerRehearsalRecord(context, runId, "offer", offer.id)

    const approvalReason = "Approved only for the isolated fictional local charter rehearsal."
    const { error: approveError } = await context.supabase.rpc("approve_offer", { p_offer_id: offer.id, p_reason: approvalReason })
    if (approveError) throw new Error("Fictional offer approval failed.")
    const { error: sentError } = await context.supabase.rpc("mark_offer_sent", { p_offer_id: offer.id, p_reason: approvalReason })
    if (sentError) throw new Error("Fictional sent-offer record failed.")
    for (const nextStatus of ["contract_issued", "awaiting_signatures"] as const) {
      const { error } = await context.supabase.rpc("transition_enquiry_status", {
        p_enquiry_id: enquiryId,
        p_new_status: nextStatus,
        p_reason: approvalReason,
      })
      if (error) throw new Error("Fictional enquiry progression failed.")
    }

    const { data: booking, error: bookingError } = await context.supabase.rpc("confirm_booking", {
      p_charter_end_date: "2027-08-21",
      p_charter_fee: 168000,
      p_charter_start_date: "2027-08-14",
      p_confirmation_reason: "All fictional signatures were reviewed for the isolated local rehearsal.",
      p_currency: "EUR",
      p_disembarkation_port: "Athens",
      p_embarkation_port: "Athens",
      p_enquiry_id: enquiryId,
      p_guest_count: 10,
      p_signed_agreement_confirmed: true,
      p_source_offer_id: offer.id,
      p_tax_rate: 5,
      p_yacht_id: yachtId,
    })
    if (bookingError || !booking) throw new Error("Fictional booking confirmation failed.")
    await registerRehearsalRecord(context, runId, "booking", booking.id)

    const { data: tasks, error: tasksError } = await context.supabase
      .from("tasks")
      .select("id")
      .eq("booking_id", booking.id)
    if (tasksError || !tasks?.length) throw new Error("Fictional booking tasks were not generated.")
    await Promise.all(tasks.map((task) => registerRehearsalRecord(context, runId, "task", task.id)))

    refreshRehearsalPaths()
    return {
      fixtureKind: "new_enquiry",
      message: "Full fictional charter rehearsal created: enquiry, sent offer, confirmed booking, 24-hour reservation buffer, document checklist, and dependent tasks 0.A–7. No provider or real recipient was contacted.",
      messageId: email.messageId,
      runId,
      success: true,
    }
  } catch {
    return { message: "The full fictional charter rehearsal could not be created. No external service was contacted." }
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
