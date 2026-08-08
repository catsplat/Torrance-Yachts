"use server"

import { createHash, randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { generateEmailSuggestion } from "@/lib/ai/service"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  createOfflineRehearsalEmail,
  type OfflineEmailKind,
  offlineRehearsalEnabled,
} from "@/lib/rehearsal/offline-email"
import { generateInvoicePdf } from "@/lib/integrations/invoice"
import { createAdminClient } from "@/lib/supabase/admin"

export type OfflineRehearsalActionState = {
  bookingId?: string
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
  entityType: "booking" | "commission_calculation" | "contact" | "contract_review" | "document" | "email_message" | "email_thread" | "enquiry" | "generated_invoice" | "invoice_profile" | "notification" | "offer" | "payment" | "task" | "yacht" | "yachtfolio_action",
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
      bookingId: booking.id,
      message: "Full fictional charter rehearsal created: enquiry, sent offer, confirmed booking, 24-hour reservation buffer, document checklist, and dependent tasks 0.A–7. No provider or real recipient was contacted.",
      messageId: email.messageId,
      runId,
      success: true,
    }
  } catch {
    return { message: "The full fictional charter rehearsal could not be created. No external service was contacted." }
  }
}

async function completeFictionalTask(
  context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestContext>>>,
  bookingId: string,
  stepCode: string,
  reason: string,
) {
  const { data: task, error: taskError } = await context.supabase
    .from("tasks")
    .select("id,status")
    .eq("booking_id", bookingId)
    .eq("step_code", stepCode)
    .single()
  if (taskError || !task) throw new Error(`Task ${stepCode} is unavailable.`)
  if (task.status === "completed") return
  const { error } = await context.supabase.rpc("complete_task", { p_reason: reason, p_task_id: task.id })
  if (error) throw new Error(`Task ${stepCode} could not be completed.`)
}

async function createSyntheticVerifiedDocument(
  context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestContext>>>,
  runId: string,
  bookingId: string,
  documentType: "broker_commission_invoice" | "broker_kyc_statement" | "cdd_check" | "charter_agreement" | "client_passport" | "kylian_commission_invoice",
  title: string,
  retentionClass: "booking_record" | "financial_record" | "identity_sensitive",
) {
  const { data: existing } = await context.supabase
    .from("documents")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("document_type", documentType)
    .eq("verification_status", "verified")
    .maybeSingle()
  if (existing) {
    await registerRehearsalRecord(context, runId, "document", existing.id)
    return existing.id
  }

  const fileId = randomUUID()
  const filename = `${documentType}-fictional-rehearsal.pdf`
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% Fictional local rehearsal document: ${title}\n%%EOF\n`)
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const quarantinePath = `${bookingId}/${fileId}/${filename}`
  const privatePath = `${bookingId}/${fileId}/released-${filename}`
  const upload = await context.supabase.storage.from("booking-quarantine").upload(
    quarantinePath,
    new Blob([bytes], { type: "application/pdf" }),
    { contentType: "application/pdf", upsert: false },
  )
  if (upload.error) throw new Error(`The fictional ${documentType} could not enter quarantine.`)

  const { data: documentId, error: registrationError } = await context.supabase.rpc("register_quarantined_booking_document", {
    p_booking_id: bookingId,
    p_content_sha256: checksum,
    p_document_type: documentType,
    p_mime_type: "application/pdf",
    p_original_filename: filename,
    p_quarantine_path: quarantinePath,
    p_retention_class: retentionClass,
    p_size_bytes: bytes.byteLength,
    p_title: title,
  })
  if (registrationError || !documentId) throw new Error(`The fictional ${documentType} metadata was rejected.`)
  await registerRehearsalRecord(context, runId, "document", documentId)

  const scanning = await context.supabase.rpc("record_document_scan_result", {
    p_document_id: documentId,
    p_reason: "Local rehearsal scanner started on a fictional PDF only.",
    p_status: "scanning",
  })
  const clean = await context.supabase.rpc("record_document_scan_result", {
    p_document_id: documentId,
    p_reason: "Local rehearsal scanner accepted a fictional PDF with no active content.",
    p_status: "clean",
  })
  if (scanning.error || clean.error) throw new Error(`The fictional ${documentType} scan could not be recorded.`)

  const releasedUpload = await context.supabase.storage.from("booking-private").upload(
    privatePath,
    new Blob([bytes], { type: "application/pdf" }),
    { contentType: "application/pdf", upsert: false },
  )
  if (releasedUpload.error) throw new Error(`The fictional ${documentType} could not enter private storage.`)
  const released = await context.supabase.rpc("release_clean_booking_document", {
    p_document_id: documentId,
    p_private_path: privatePath,
    p_reason: "Local rehearsal released a clean fictional PDF to private storage.",
  })
  if (released.error) throw new Error(`The fictional ${documentType} could not be released.`)
  await context.supabase.storage.from("booking-quarantine").remove([quarantinePath])
  const reviewed = await context.supabase.rpc("review_booking_document", {
    p_approved: true,
    p_document_id: documentId,
    p_reason: "Reviewed and accepted as a fictional local rehearsal document.",
  })
  if (reviewed.error) throw new Error(`The fictional ${documentType} could not be verified.`)
  return documentId
}

async function createFictionalGeneratedCommissionInvoice(
  context: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestContext>>>,
  runId: string,
  bookingId: string,
) {
  const { data: existingInvoice, error: existingInvoiceError } = await context.supabase
    .from("generated_invoices")
    .select("id,document_id,invoice_profile_id")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (existingInvoiceError) throw new Error("Fictional invoice history is unavailable.")
  if (existingInvoice) {
    await Promise.all([
      registerRehearsalRecord(context, runId, "document", existingInvoice.document_id),
      registerRehearsalRecord(context, runId, "generated_invoice", existingInvoice.id),
      registerRehearsalRecord(context, runId, "invoice_profile", existingInvoice.invoice_profile_id),
    ])
    return existingInvoice.document_id
  }

  const { data: profile, error: profileError } = await context.supabase.rpc("configure_rehearsal_invoice_profile", {
    p_rehearsal_run_id: runId,
  })
  if (profileError || !profile) throw new Error("Fictional invoice profile is unavailable.")
  await registerRehearsalRecord(context, runId, "invoice_profile", profile.id)

  const { data: commission, error: commissionError } = await context.supabase
    .from("commission_calculations")
    .select("id,amount,currency")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (commissionError || !commission) throw new Error("Fictional commission calculation is unavailable.")
  await registerRehearsalRecord(context, runId, "commission_calculation", commission.id)

  const invoiceNumber = `RHR-${bookingId.slice(0, 8).toUpperCase()}-1`
  const bytes = await generateInvoicePdf({
    amount: Number(commission.amount),
    currency: commission.currency,
    invoiceNumber,
    issueDate: "2027-06-15",
    issuerAddress: profile.issuer_address,
    issuerName: profile.issuer_name,
    paymentInstructions: profile.payment_instructions,
    recipientAddress: profile.recipient_address,
    recipientName: profile.recipient_name,
    serviceDescription: "Fictional 2% charter commission — local rehearsal only",
  })
  const fileId = randomUUID()
  const storagePath = `${bookingId}/${fileId}/fictional-local-commission-invoice.pdf`
  const { error: uploadError } = await context.supabase.storage.from("booking-private").upload(
    storagePath,
    new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
    { cacheControl: "private, max-age=0", contentType: "application/pdf", upsert: false },
  )
  if (uploadError) throw new Error("Fictional invoice PDF upload failed.")

  const { data: documentId, error: documentError } = await createAdminClient().rpc("register_trusted_generated_document", {
    p_booking_id: bookingId,
    p_content_sha256: createHash("sha256").update(bytes).digest("hex"),
    p_document_type: "kylian_commission_invoice",
    p_mime_type: "application/pdf",
    p_original_filename: `${invoiceNumber}.pdf`,
    p_retention_class: "financial_record",
    p_size_bytes: bytes.byteLength,
    p_storage_path: storagePath,
    p_title: `Fictional commission invoice ${invoiceNumber}`,
    p_created_by: context.userId,
  })
  if (documentError || !documentId) {
    await context.supabase.storage.from("booking-private").remove([storagePath])
    throw new Error("Fictional invoice document registration failed.")
  }
  await registerRehearsalRecord(context, runId, "document", documentId)
  const { data: invoiceId, error: invoiceError } = await context.supabase.rpc("register_rehearsal_generated_invoice", {
    p_booking_id: bookingId,
    p_commission_calculation_id: commission.id,
    p_document_id: documentId,
    p_invoice_number: invoiceNumber,
    p_issue_date: "2027-06-15",
    p_rehearsal_run_id: runId,
    p_service_description: "Fictional 2% charter commission — local rehearsal only",
  })
  if (invoiceError || !invoiceId) throw new Error("Fictional invoice audit record failed.")
  await registerRehearsalRecord(context, runId, "generated_invoice", invoiceId)
  return documentId
}

export async function advanceFullCharterRehearsalAction(
  _state: OfflineRehearsalActionState,
  formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") return { message: "Administrator access is required." }
  if (!offlineRehearsalEnabled()) return { message: "Offline rehearsal is available only in local development." }
  const runId = formData.get("runId")
  if (typeof runId !== "string" || !runId) return { message: "Create a full fictional charter rehearsal first." }

  const { data: bookingRecord, error: bookingRecordError } = await context.supabase
    .from("rehearsal_run_records")
    .select("entity_id")
    .eq("rehearsal_run_id", runId)
    .eq("entity_type", "booking")
    .maybeSingle()
  if (bookingRecordError || !bookingRecord) return { message: "This rehearsal does not contain a fictional booking." }
  const bookingId = bookingRecord.entity_id

  try {
    await completeFictionalTask(context, bookingId, "0.A", "Fictional KYC request prepared for local rehearsal.")
    await createSyntheticVerifiedDocument(context, runId, bookingId, "broker_kyc_statement", "Fictional broker KYC statement", "identity_sensitive")
    await createSyntheticVerifiedDocument(context, runId, bookingId, "client_passport", "Fictional client passport", "identity_sensitive")
    await createSyntheticVerifiedDocument(context, runId, bookingId, "cdd_check", "Fictional CDD check", "identity_sensitive")
    await completeFictionalTask(context, bookingId, "0.B", "Fictional KYC, passport, and CDD records were verified locally.")

    const agreementId = await createSyntheticVerifiedDocument(context, runId, bookingId, "charter_agreement", "Fictional fully signed charter agreement", "booking_record")
    await completeFictionalTask(context, bookingId, "1.A", "Fictional signed agreement entered the private local document workflow.")

    const { data: existingReview } = await context.supabase.from("contract_reviews")
      .select("id,status").eq("booking_id", bookingId).eq("status", "approved").maybeSingle()
    if (!existingReview) {
      const { data: reviewId, error: reviewError } = await context.supabase.rpc("save_contract_review", {
        p_booking_id: bookingId,
        p_charter_end_date: "2027-08-21",
        p_charter_fee: 168000,
        p_charter_start_date: "2027-08-14",
        p_commission_rate: 2,
        p_currency: "EUR",
        p_disembarkation_port: "Athens",
        p_embarkation_port: "Athens",
        p_review_notes: "Fictional local rehearsal contract facts reviewed by an administrator.",
        p_source_document_id: agreementId,
        p_tax_rate: 5,
      })
      if (reviewError || !reviewId) throw new Error("The fictional contract review could not be saved.")
      await registerRehearsalRecord(context, runId, "contract_review", reviewId)
      const { error: approvalError } = await context.supabase.rpc("approve_contract_review", {
        p_payment_amounts: [84000, 84000],
        p_payment_dates: ["2027-07-15", "2027-08-07"],
        p_review_id: reviewId,
      })
      if (approvalError) throw new Error("The fictional payment schedule could not be approved.")
    }

    const [{ data: payments }, { data: commission }] = await Promise.all([
      context.supabase.from("payment_schedules").select("id").eq("booking_id", bookingId),
      context.supabase.from("commission_calculations").select("id").eq("booking_id", bookingId).maybeSingle(),
    ])
    await Promise.all([
      ...(payments ?? []).map((payment) => registerRehearsalRecord(context, runId, "payment", payment.id)),
      ...(commission ? [registerRehearsalRecord(context, runId, "commission_calculation", commission.id)] : []),
    ])
    await completeFictionalTask(context, bookingId, "1.B", "Fictional signed-contract facts and two instalments were reviewed and approved.")
    refreshRehearsalPaths()
    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath(`/bookings/${bookingId}/documents`)
    revalidatePath(`/bookings/${bookingId}/tasks`)
    return {
      bookingId,
      message: "Fictional KYC, passport, CDD, and signed agreement completed the quarantine-to-verification path. Contract facts, two instalments, and commission were approved through the normal commands. Continue remaining external/manual tasks from the fictional booking.",
      runId,
      success: true,
    }
  } catch {
    return { bookingId, message: "The fictional compliance and contract rehearsal could not be advanced safely. No provider or real recipient was contacted.", runId }
  }
}

export async function completeFullCharterRehearsalAction(
  _state: OfflineRehearsalActionState,
  formData: FormData,
): Promise<OfflineRehearsalActionState> {
  void _state
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") return { message: "Administrator access is required." }
  if (!offlineRehearsalEnabled()) return { message: "Offline rehearsal is available only in local development." }
  const runId = formData.get("runId")
  if (typeof runId !== "string" || !runId) return { message: "Create a full fictional charter rehearsal first." }

  const { data: bookingRecord, error: bookingRecordError } = await context.supabase
    .from("rehearsal_run_records")
    .select("entity_id")
    .eq("rehearsal_run_id", runId)
    .eq("entity_type", "booking")
    .maybeSingle()
  if (bookingRecordError || !bookingRecord) return { message: "This rehearsal does not contain a fictional booking." }
  const bookingId = bookingRecord.entity_id

  try {
    const { data: reviewedContract, error: contractError } = await context.supabase
      .from("contract_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("status", "approved")
      .maybeSingle()
    if (contractError || !reviewedContract) {
      return { bookingId, message: "Complete the fictional compliance and contract review before rehearsing the remaining lifecycle.", runId }
    }

    await createFictionalGeneratedCommissionInvoice(context, runId, bookingId)
    await completeFictionalTask(context, bookingId, "1.C", "Fictional commission-invoice draft reviewed locally. No Telegram message or recipient was contacted.")
    await completeFictionalTask(context, bookingId, "1.D", "Fictional Kylian commission invoice recorded in private local storage.")

    const { data: yachtfolioAction, error: yachtfolioError } = await context.supabase
      .from("yachtfolio_booking_actions")
      .select("id,status")
      .eq("booking_id", bookingId)
      .maybeSingle()
    if (yachtfolioError || !yachtfolioAction) throw new Error("Fictional Yachtfolio action is unavailable.")
    await registerRehearsalRecord(context, runId, "yachtfolio_action", yachtfolioAction.id)
    if (yachtfolioAction.status !== "completed") {
      const { error } = await context.supabase.rpc("set_yachtfolio_action_status", {
        p_action_id: yachtfolioAction.id,
        p_new_status: "completed",
        p_reason: "Fictional local evidence: booked dates and status were reviewed in the Yachtfolio rehearsal boundary.",
      })
      if (error) throw new Error("Fictional Yachtfolio evidence could not be recorded.")
    }
    await completeFictionalTask(context, bookingId, "1.E", "Fictional Yachtfolio completion evidence was recorded locally.")
    await completeFictionalTask(context, bookingId, "2.A", "Fictional captain contact draft reviewed locally. No broker was contacted.")
    await completeFictionalTask(context, bookingId, "2.B", "Fictional captain booking notice reviewed locally. No captain was contacted.")

    const { data: payments, error: paymentError } = await context.supabase
      .from("payment_schedules")
      .select("id,instalment_number,status")
      .eq("booking_id", bookingId)
      .order("instalment_number")
    if (paymentError || !payments?.length) throw new Error("Fictional payment schedule is unavailable.")
    for (const payment of payments) {
      await registerRehearsalRecord(context, runId, "payment", payment.id)
      if (payment.status === "scheduled") {
        const { error } = await context.supabase.rpc("mark_payment_paid", {
          p_payment_id: payment.id,
          p_reason: `Fictional local rehearsal: instalment ${payment.instalment_number} payment evidence reviewed by an administrator.`,
        })
        if (error) throw new Error("Fictional payment evidence could not be recorded.")
      }
    }
    await completeFictionalTask(context, bookingId, "3", "Fictional first instalment was recorded paid after local evidence review.")
    await completeFictionalTask(context, bookingId, "4.A", "Fictional second instalment was recorded paid after local evidence review.")

    const { data: booking, error: bookingError } = await context.supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single()
    if (bookingError || !booking) throw new Error("Fictional booking is unavailable.")
    if (booking.status === "confirmed") {
      const { error } = await context.supabase.rpc("transition_booking_status", {
        p_booking_id: bookingId,
        p_new_status: "charter_active",
        p_reason: "Fictional local rehearsal advanced the charter-start checkpoint after human review.",
      })
      if (error) throw new Error("Fictional charter start could not be recorded.")
    }
    await completeFictionalTask(context, bookingId, "5", "Fictional charter-start notification reviewed locally. No recipient was contacted.")

    const { data: currentBooking, error: currentBookingError } = await context.supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single()
    if (currentBookingError || !currentBooking) throw new Error("Fictional booking lifecycle is unavailable.")
    if (currentBooking.status === "charter_active") {
      const { error } = await context.supabase.rpc("transition_booking_status", {
        p_booking_id: bookingId,
        p_new_status: "completed",
        p_reason: "Fictional local rehearsal advanced the charter-end checkpoint after human review.",
      })
      if (error) throw new Error("Fictional charter completion could not be recorded.")
    }
    await completeFictionalTask(context, bookingId, "6", "Fictional charter-end notification reviewed locally. No recipient was contacted.")
    await createSyntheticVerifiedDocument(context, runId, bookingId, "broker_commission_invoice", "Fictional broker commission invoice evidence", "financial_record")
    await completeFictionalTask(context, bookingId, "7", "Fictional broker follow-up and commission-document evidence recorded locally. No broker was contacted.")

    refreshRehearsalPaths()
    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath(`/bookings/${bookingId}/documents`)
    revalidatePath(`/bookings/${bookingId}/tasks`)
    return {
      bookingId,
      message: "Fictional invoice evidence, Yachtfolio confirmation, captain/broker hand-offs, payment settlement, charter start/end, and broker follow-up were recorded through the normal local controls. No provider or recipient was contacted.",
      runId,
      success: true,
    }
  } catch {
    return { bookingId, message: "The fictional post-contract rehearsal could not be completed safely. No provider or real recipient was contacted.", runId }
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

  const { data: bookingRecords, error: bookingRecordsError } = await context.supabase
    .from("rehearsal_run_records")
    .select("entity_id")
    .eq("rehearsal_run_id", runId)
    .eq("entity_type", "booking")
  if (bookingRecordsError) return { message: "The fictional run could not be inspected before reset." }

  const bookingIds = bookingRecords.map((record) => record.entity_id)
  if (bookingIds.length) {
    const { data: documents, error: documentsError } = await context.supabase
      .from("documents")
      .select("storage_bucket,storage_path")
      .in("booking_id", bookingIds)
    if (documentsError) return { message: "The fictional document list could not be inspected before reset." }
    const pathsByBucket = new Map<string, string[]>()
    for (const document of documents) {
      const paths = pathsByBucket.get(document.storage_bucket) ?? []
      paths.push(document.storage_path)
      pathsByBucket.set(document.storage_bucket, paths)
    }
    for (const [bucket, paths] of pathsByBucket) {
      const { error: removeError } = await context.supabase.storage.from(bucket).remove(paths)
      if (removeError) return { message: "Some fictional files could not be removed. The database run remains available, so retry after reviewing the local Storage boundary." }
    }
  }

  const { error } = await context.supabase.rpc("reset_rehearsal_run", {
    p_reason: "Administrator removed the completed fictional rehearsal run.",
    p_rehearsal_run_id: runId,
  })
  if (error) {
    return {
      message: "The fictional run could not be reset. Its database records remain available; some synthetic files may already have been removed. Review the local boundary error before trying again.",
    }
  }
  refreshRehearsalPaths()
  return { message: "The fictional run was removed. Its reset audit evidence remains.", success: true }
}
