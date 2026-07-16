"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  adHocTaskSchema,
  cloneTemplateSchema,
  newTemplateStepSchema,
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
  const parsed = parseForm(taskReasonSchema, formData)
  if (!validId.success) return { message: "The task reference is invalid." }
  if (!parsed.success) return validationState(parsed.error)
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { data, error } = await context.supabase.rpc(command, {
    p_task_id: validId.data,
    p_reason: parsed.data.reason,
  })
  if (error || !data) {
    return {
      message: error?.message.includes("Yachtfolio")
        ? "Complete the linked Yachtfolio action before this task."
        : "The task changed elsewhere or is not in the required state.",
    }
  }
  revalidateTask(validId.data, data.booking_id)
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
    p_reason: parsed.data.reason,
  })
  if (error || !data) return { message: "The task schedule could not be updated." }
  revalidateTask(validId.data, data.booking_id)
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
  revalidateTask(data.id, data.booking_id)
  redirect(`/tasks/${data.id}?created=1`)
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
