import "server-only"

import { cache } from "react"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

export const taskRegisterPageSize = 50

const taskCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  dueSort: z.iso.date(),
  id: z.uuid(),
})

function decodeTaskCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return taskCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

function encodeTaskCursor(cursor: z.infer<typeof taskCursorSchema>) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

export const getActiveTaskAssignees = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("list_active_staff_directory")
  if (error) throw new Error("Unable to load task assignees.")
  return data
})

export async function getTaskTemplateRegister() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_templates")
    .select("*, steps:task_template_steps(count)")
    .order("updated_at", { ascending: false })
  if (error) throw new Error("Unable to load task templates.")
  return data
}

export async function getTaskTemplateDetail(id: string) {
  const supabase = await createClient()
  const [templateResult, stepsResult, dependenciesResult] = await Promise.all([
    supabase.from("task_templates").select("*").eq("id", id).single(),
    supabase.from("task_template_steps").select("*").eq("template_id", id)
      .order("sort_order").order("step_code"),
    supabase.from("task_template_step_dependencies").select(
      "step_id, depends_on_step_id",
    ),
  ])
  if (templateResult.error || stepsResult.error || dependenciesResult.error) {
    throw new Error("Unable to load the task template.")
  }
  const stepIds = new Set(stepsResult.data.map((step) => step.id))
  return {
    dependencies: dependenciesResult.data.filter(
      (dependency) =>
        stepIds.has(dependency.step_id) &&
        stepIds.has(dependency.depends_on_step_id),
    ),
    steps: stepsResult.data,
    template: templateResult.data,
  }
}

export type TaskRegisterFilters = {
  assigneeId?: string
  cursor?: string
  dueState?: "future" | "none" | "overdue" | "today"
  priority?: Enums<"task_priority">
  query?: string
  status?: Enums<"task_status">
  unassigned?: boolean
}

export async function getTaskRegisterPage(filters: TaskRegisterFilters) {
  const cursor = decodeTaskCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data: page, error: pageError }, { data: totalCount, error: countError }] =
    await Promise.all([
      supabase.rpc("list_task_register_page", {
        p_assignee_id: filters.assigneeId,
        p_cursor_created_at: cursor?.createdAt,
        p_cursor_due_sort: cursor?.dueSort,
        p_cursor_id: cursor?.id,
        p_due_state: filters.dueState,
        p_limit: taskRegisterPageSize + 1,
        p_priority: filters.priority,
        p_query: filters.query,
        p_status: filters.status,
        p_unassigned: filters.unassigned ?? false,
      }),
      supabase.rpc("count_task_register", {
        p_assignee_id: filters.assigneeId,
        p_due_state: filters.dueState,
        p_priority: filters.priority,
        p_query: filters.query,
        p_status: filters.status,
        p_unassigned: filters.unassigned ?? false,
      }),
    ])
  if (pageError || countError) throw new Error("Unable to load the complete task register.")

  const hasNextPage = page.length > taskRegisterPageSize
  const tasks = page.slice(0, taskRegisterPageSize)
  const last = tasks.at(-1)
  return {
    nextCursor: hasNextPage && last
      ? encodeTaskCursor({ createdAt: last.created_at, dueSort: last.due_sort, id: last.id })
      : null,
    tasks,
    totalCount: totalCount ?? 0,
  }
}

export async function getTaskDetail(id: string) {
  const supabase = await createClient()
  const [taskResult, dependenciesResult, dependentsResult, historyResult, notesResult] =
    await Promise.all([
      supabase.from("tasks").select(`
        *,
        booking:bookings!tasks_booking_id_fkey(
          id, reference, charter_start_date, charter_end_date,
          yacht:yachts!bookings_yacht_id_fkey(id, name),
          customer:contacts!bookings_customer_contact_id_fkey(full_name),
          broker:contacts!bookings_broker_contact_id_fkey(id, full_name, email),
          broker_company:companies!bookings_broker_company_id_fkey(name)
        ),
        enquiry:enquiries!tasks_enquiry_id_fkey(id, reference, yacht:yachts!enquiries_requested_yacht_id_fkey(id, name)),
        assignee:profiles!tasks_assigned_user_id_fkey(display_name)
      `).eq("id", id).single(),
      supabase.from("task_dependencies").select(
        "depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, reference, step_code, title, status)",
      ).eq("task_id", id),
      supabase.from("task_dependencies").select(
        "task:tasks!task_dependencies_task_id_fkey(id, reference, step_code, title, status)",
      ).eq("depends_on_task_id", id),
      supabase.from("task_history").select(
        "*, actor:profiles!task_history_changed_by_fkey(display_name)",
      ).eq("task_id", id).order("created_at", { ascending: false }),
      supabase.from("task_notes").select(
        "*, author:profiles!task_notes_created_by_fkey(display_name)",
      ).eq("task_id", id).order("created_at", { ascending: false }),
    ])
  if (
    taskResult.error || dependenciesResult.error || dependentsResult.error ||
    historyResult.error || notesResult.error
  ) throw new Error("Unable to load the task record.")
  return {
    dependencies: dependenciesResult.data.map((row) => row.depends_on),
    dependents: dependentsResult.data.map((row) => row.task),
    history: historyResult.data,
    notes: notesResult.data,
    task: taskResult.data,
  }
}

export async function getBookingTaskChecklist(bookingId: string) {
  const supabase = await createClient()
  const [bookingResult, tasksResult] = await Promise.all([
    supabase.from("bookings").select(
      "id, reference, charter_start_date, charter_end_date, yacht:yachts!bookings_yacht_id_fkey(name)",
    ).eq("id", bookingId).single(),
    supabase.from("tasks").select(
      "id, reference, step_code, title, status, schedule_inapplicable, priority, required, due_date, blocked_reason, source, assigned_user_id, assignee:profiles!tasks_assigned_user_id_fkey(display_name)",
    ).eq("booking_id", bookingId).order("step_code").order("created_at"),
  ])
  if (bookingResult.error || tasksResult.error) {
    throw new Error("Unable to load the booking checklist.")
  }
  return { booking: bookingResult.data, tasks: tasksResult.data }
}

export async function getWorkItemTasks(workType: "booking" | "enquiry", workId: string) {
  const supabase = await createClient()
  const column = workType === "booking" ? "booking_id" : "enquiry_id"
  const { data, error } = await supabase
    .from("tasks")
    .select("id, reference, step_code, title, status")
    .eq(column, workId)
    .in("status", ["blocked", "ready"])
    .order("created_at")
  if (error) throw new Error("Unable to load task prerequisites.")
  return data
}
