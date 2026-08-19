"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { renderCommunicationTemplate } from "@/lib/ai/template"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  adHocTaskSchema,
  cloneTemplateSchema,
  newTemplateStepSchema,
  optionalTaskNoteSchema,
  operationalTaskSchema,
  parseForm,
  taskNoteSchema,
  taskReasonSchema,
  taskScheduleSchema,
  templateStepSchema,
} from "@/lib/tasks/validation"

export type TaskActionState = {
  fieldErrors?: Record<string, string[] | undefined>
  message?: string
  success?: boolean
}

const idSchema = z.uuid()
const expiredMessage = "Your session has expired. Sign in again."

function validationState(error: z.ZodError): TaskActionState {
  return {
    fieldErrors: error.flatten().fieldErrors,
    message: "Review the highlighted fields.",
  }
}

async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? { message: expiredMessage }
}

function revalidateTask(taskId: string, bookingId?: string) {
  revalidatePath("/")
  revalidatePath("/tasks")
  revalidatePath(`/tasks/${taskId}`)
  if (bookingId) {
    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath(`/bookings/${bookingId}/tasks`)
  }
}

async function runTaskReasonCommand(
  taskId: string,
  formData: FormData,
  command: "complete_task" | "reopen_task" | "cancel_ad_hoc_task",
): Promise<TaskActionState> {
  const validId = idSchema.safeParse(taskId)
  if (!validId.success) return { message: "The task reference is invalid." }
  const parsed = command === "complete_task"
    ? parseForm(optionalTaskNoteSchema, formData)
    : parseForm(taskReasonSchema, formData)
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc(command, {
    p_task_id: validId.data,
    p_reason: parsed.data.reason || "Task completed",
  })
  if (error || !data) {
    return {
      message: error?.message.includes("Yachtfolio")
        ? "Complete the linked Yachtfolio action before this task."
        : "The task changed elsewhere or is not in the required state.",
    }
  }
  revalidateTask(validId.data, data.booking_id ?? undefined)
  return {
    message: command === "complete_task"
      ? "Task completed and dependent work re-evaluated."
      : command === "reopen_task"
        ? "Task reopened and dependent work re-blocked where required."
        : "Ad-hoc task cancelled with an audit record.",
    success: true,
  }
}

export async function completeTaskAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
) {
  return runTaskReasonCommand(taskId, formData, "complete_task")
}

export async function reopenTaskAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
) {
  return runTaskReasonCommand(taskId, formData, "reopen_task")
}

export async function cancelAdHocTaskAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
) {
  return runTaskReasonCommand(taskId, formData, "cancel_ad_hoc_task")
}

export async function updateTaskScheduleAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const validId = idSchema.safeParse(taskId)
  const parsed = parseForm(taskScheduleSchema, formData)
  if (!validId.success) return { message: "The task reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("update_task_schedule", {
    p_task_id: validId.data,
    p_due_date: parsed.data.due_date as unknown as string,
    p_assigned_user_id: parsed.data.assigned_user_id as unknown as string,
    p_priority: parsed.data.priority,
    p_reason: "Task schedule updated",
  })
  if (error || !data) return { message: "The task schedule could not be updated." }
  revalidateTask(validId.data, data.booking_id ?? undefined)
  return { message: "Schedule, assignment, and priority updated.", success: true }
}

export async function addTaskNoteAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const validId = idSchema.safeParse(taskId)
  const parsed = parseForm(taskNoteSchema, formData)
  if (!validId.success) return { message: "The task reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("add_task_note", {
    p_task_id: validId.data,
    p_body: parsed.data.body,
  })
  if (error) return { message: "The note could not be added." }
  revalidatePath(`/tasks/${validId.data}`)
  return { message: "Note added to the permanent task record.", success: true }
}

export async function prepareTaskCommunicationAction(
  taskId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const validId = idSchema.safeParse(taskId)
  void formData
  if (!validId.success) return { message: "The task reference is invalid." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data: task, error: taskError } = await context.supabase
    .from("tasks")
    .select(`
      id, step_code, title,
      booking:bookings!tasks_booking_id_fkey(
        id, reference, charter_start_date, charter_end_date,
        yacht:yachts!bookings_yacht_id_fkey(id, name),
        customer:contacts!bookings_customer_contact_id_fkey(full_name),
        broker:contacts!bookings_broker_contact_id_fkey(id, full_name, email),
        broker_company:companies!bookings_broker_company_id_fkey(name)
      )
    `)
    .eq("id", validId.data)
    .single()
  if (taskError || !task?.step_code || !task.booking) {
    return { message: "The task context could not be loaded." }
  }

  const internalStepKinds = {
    "0.A": "kyc_request",
    "2.A": "captain_contact",
    "7": "broker_follow_up",
  } as const
  const internalKind = internalStepKinds[
    task.step_code as keyof typeof internalStepKinds
  ]
  let body = ""
  let title = task.title
  let recipientUserId: string | null = context.userId
  let recipientContactId: string | null = null
  let channel: "email_draft" | "telegram" = "telegram"

  if (internalKind) {
    const { data: template, error: templateError } = await context.supabase
      .from("communication_templates")
      .select("subject_template, body_template")
      .eq("kind", internalKind)
      .eq("status", "approved")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (templateError || !template) {
      return { message: "Approve the matching communication template in Settings first." }
    }
    const values: Record<string, string> = {
      broker_company_name: task.booking.broker_company?.name ?? "the broker company",
      broker_name: task.booking.broker?.full_name ?? "Broker",
      captain_email: "Not recorded",
      captain_name: "Captain",
      captain_phone: "Not recorded",
      charter_end_date: task.booking.charter_end_date,
      charter_start_date: task.booking.charter_start_date,
      client_name: task.booking.customer?.full_name ?? "the charter client",
      passport_country: "to be confirmed",
      residency_country: "to be confirmed",
      yacht_name: task.booking.yacht.name,
      year: String(new Date().getFullYear()),
    }
    if (internalKind === "captain_contact") {
      const { data: captain } = await context.supabase
        .from("yacht_contacts")
        .select("contact:contacts!yacht_contacts_contact_id_fkey(full_name,email,phone)")
        .eq("yacht_id", task.booking.yacht.id)
        .eq("responsibility", "captain")
        .eq("is_primary", true)
        .maybeSingle()
      values.captain_name = captain?.contact.full_name ?? "Captain"
      values.captain_email = captain?.contact.email ?? "Not recorded"
      values.captain_phone = captain?.contact.phone ?? "Not recorded"
    }
    const subject = renderCommunicationTemplate(template.subject_template, values)
    body = `${subject}\n\n${renderCommunicationTemplate(template.body_template, values)}`
  } else if (task.step_code === "2.B") {
    const { data: captain } = await context.supabase
      .from("yacht_contacts")
      .select("contact:contacts!yacht_contacts_contact_id_fkey(id,full_name,email)")
      .eq("yacht_id", task.booking.yacht.id)
      .eq("responsibility", "captain")
      .eq("is_primary", true)
      .maybeSingle()
    if (!captain?.contact.email) {
      return { message: "Record an email for the yacht's primary captain first." }
    }
    recipientUserId = null
    recipientContactId = captain.contact.id
    channel = "email_draft"
    title = `${task.booking.yacht.name} charter booking notification`
    body = [
      `Dear ${captain.contact.full_name},`,
      `A charter booking has been confirmed for ${task.booking.yacht.name}.`,
      `Charter dates: ${task.booking.charter_start_date} to ${task.booking.charter_end_date}.`,
      `Booking reference: ${task.booking.reference}.`,
      "Please review the booking details with the operations team before taking action.",
    ].join("\n\n")
  } else {
    return { message: "This task does not have a communication assistant." }
  }

  const { error } = await context.supabase.rpc("create_notification", {
    p_action_url: `/tasks/${task.id}`,
    p_body: body,
    p_channel: channel,
    p_idempotency_key: `task-draft:${task.id}:${randomUUID()}`,
    p_notification_type: `task_${task.step_code.replace(".", "_").toLowerCase()}_draft`,
    p_priority: "high",
    p_recipient_contact_id: recipientContactId as unknown as string,
    p_recipient_user_id: recipientUserId as unknown as string,
    p_requires_approval: true,
    p_source_id: task.id,
    p_source_type: "task",
    p_title: title,
  })
  if (error) return { message: "The reviewable communication could not be prepared." }
  revalidatePath("/integrations")
  revalidatePath(`/tasks/${task.id}`)
  return {
    message: channel === "telegram"
      ? "Draft prepared for approval and Telegram delivery."
      : "Captain email draft prepared for approval before Gmail creation.",
    success: true,
  }
}

export async function addAdHocTaskAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseForm(adHocTaskSchema, formData)
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("add_ad_hoc_task", {
    p_booking_id: parsed.data.booking_id,
    p_title: parsed.data.title,
    p_description: parsed.data.description as unknown as string,
    p_due_date: parsed.data.due_date as unknown as string,
    p_priority: parsed.data.priority,
    p_assigned_user_id: parsed.data.assigned_user_id as unknown as string,
  })
  if (error || !data) return { message: "The ad-hoc task could not be created." }
  revalidateTask(data.id, data.booking_id ?? undefined)
  redirect(`/tasks/${data.id}?created=1`)
}

export async function addOperationalTaskAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseForm(operationalTaskSchema, formData)
  if (!parsed.success) return validationState(parsed.error)
  const dependencyIds = formData.getAll("depends_on_task_ids")
    .map((value) => z.uuid().safeParse(value))
    .filter((value) => value.success)
    .map((value) => value.data)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("add_operational_task", {
    p_assigned_user_id: parsed.data.assigned_user_id as unknown as string,
    p_booking_id: (parsed.data.work_type === "booking" ? parsed.data.work_id : null) as unknown as string,
    p_depends_on_task_ids: dependencyIds,
    p_description: parsed.data.description as unknown as string,
    p_document_type: parsed.data.document_type as never,
    p_due_date: parsed.data.due_date as unknown as string,
    p_enquiry_id: (parsed.data.work_type === "enquiry" ? parsed.data.work_id : null) as unknown as string,
    p_expected_booking_status: parsed.data.expected_booking_status as never,
    p_not_before_date: parsed.data.not_before_date as unknown as string,
    p_priority: parsed.data.priority,
    p_title: parsed.data.title,
  })
  if (error || !data) return { message: "The task could not be added. Check its dependencies and conditions." }
  revalidateTask(data.id, data.booking_id ?? undefined)
  if (data.enquiry_id) revalidatePath(`/enquiries/${data.enquiry_id}`)
  return { message: data.status === "ready" ? "Task added and ready." : "Task added with its conditions recorded.", success: true }
}

export async function generateBookingTasksAction(
  bookingId: string,
  _state: TaskActionState,
  _formData: FormData,
): Promise<TaskActionState> {
  void _state
  void _formData
  const validId = idSchema.safeParse(bookingId)
  if (!validId.success) return { message: "The booking reference is invalid." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("generate_booking_tasks", {
    p_booking_id: validId.data,
    p_template_id: undefined,
  })
  if (error) return { message: "Approve a default task template before generating tasks." }
  revalidatePath("/tasks")
  revalidatePath(`/bookings/${validId.data}`)
  revalidatePath(`/bookings/${validId.data}/tasks`)
  return {
    message: data === 0 ? "This booking already has its complete task set." : `${data} tasks generated.`,
    success: true,
  }
}

export async function cloneTaskTemplateAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseForm(cloneTemplateSchema, formData)
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc("clone_task_template", {
    p_source_template_id: parsed.data.source_template_id,
    p_name: parsed.data.name,
  })
  if (error || !data) return { message: "Only an administrator can create a template version." }
  revalidatePath("/tasks/templates")
  redirect(`/tasks/templates/${data.id}?created=1`)
}

export async function updateTaskTemplateStepAction(
  stepId: string,
  templateId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const step = idSchema.safeParse(stepId)
  const template = idSchema.safeParse(templateId)
  const parsed = parseForm(templateStepSchema, formData)
  if (!step.success || !template.success) return { message: "The template reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_task_template_step", {
    p_step_id: step.data,
    p_title: parsed.data.title,
    p_description: parsed.data.description as unknown as string,
    p_priority: parsed.data.priority,
    p_required: parsed.data.required,
    p_due_anchor: parsed.data.due_anchor,
    p_due_offset_days: parsed.data.due_offset_days,
    p_due_date_required: parsed.data.due_date_required,
    p_reminder_lead_days: parsed.data.reminder_lead_days as unknown as number,
    p_escalation_after_days: parsed.data.escalation_after_days as unknown as number,
  })
  if (error) return { message: "Only draft template steps can be edited." }
  const dependencyIds = formData.getAll("depends_on_step_ids")
    .map(String)
    .filter((value) => idSchema.safeParse(value).success)
  const { error: dependencyError } = await context.supabase.rpc(
    "replace_task_template_dependencies",
    {
      p_step_id: step.data,
      p_depends_on_step_ids: dependencyIds,
    },
  )
  if (dependencyError) {
    return { message: "The dependency graph is invalid or would contain a cycle." }
  }
  revalidatePath(`/tasks/templates/${template.data}`)
  return { message: "Draft step updated and audited.", success: true }
}

export async function addTaskTemplateStepAction(
  templateId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const template = idSchema.safeParse(templateId)
  const parsed = parseForm(newTemplateStepSchema, formData)
  if (!template.success || !parsed.success) {
    return parsed.success
      ? { message: "The template reference is invalid." }
      : validationState(parsed.error)
  }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("add_task_template_step", {
    p_template_id: template.data,
    p_step_code: parsed.data.step_code,
    p_title: parsed.data.title,
    p_description: parsed.data.description as unknown as string,
    p_priority: parsed.data.priority,
    p_required: parsed.data.required,
    p_due_anchor: parsed.data.due_anchor,
    p_due_offset_days: parsed.data.due_offset_days,
    p_due_date_required: parsed.data.due_date_required,
    p_reminder_lead_days: parsed.data.reminder_lead_days as unknown as number,
    p_escalation_after_days: parsed.data.escalation_after_days as unknown as number,
    p_sort_order: parsed.data.sort_order,
  })
  if (error) return { message: "The step code must be unique within an editable draft." }
  revalidatePath(`/tasks/templates/${template.data}`)
  return { message: "Draft template step added.", success: true }
}

export async function deleteTaskTemplateStepAction(
  stepId: string,
  templateId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const step = idSchema.safeParse(stepId)
  const template = idSchema.safeParse(templateId)
  const parsed = parseForm(taskReasonSchema, formData)
  if (!step.success || !template.success) return { message: "The template reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("delete_task_template_step", {
    p_step_id: step.data,
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "This protected or immutable step cannot be deleted." }
  revalidatePath(`/tasks/templates/${template.data}`)
  return { message: "Draft step removed with its dependency links.", success: true }
}

export async function approveTaskTemplateAction(
  templateId: string,
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const validId = idSchema.safeParse(templateId)
  const parsed = parseForm(taskReasonSchema, formData)
  if (!validId.success) return { message: "The template reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("approve_task_template", {
    p_template_id: validId.data,
  })
  if (error) return { message: "Only an administrator can approve a valid draft template." }
  revalidatePath("/tasks/templates")
  revalidatePath(`/tasks/templates/${validId.data}`)
  return { message: "Template approved as the new default; the prior version was retired.", success: true }
}
