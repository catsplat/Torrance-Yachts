import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export const getActiveTaskAssignees = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name")
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

export async function getTaskRegister() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tasks").select(`
    id, reference, booking_id, step_code, title, status, priority, source,
    required, due_date, blocked_reason, external_action, assigned_user_id,
    booking:bookings!tasks_booking_id_fkey(
      reference,
      yacht:yachts!bookings_yacht_id_fkey(id, name)
    ),
    assignee:profiles!tasks_assigned_user_id_fkey(display_name)
  `).order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false }).limit(1000)
  if (error) throw new Error("Unable to load tasks.")
  return data
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
      "id, reference, step_code, title, status, priority, required, due_date, blocked_reason, source, assigned_user_id, assignee:profiles!tasks_assigned_user_id_fkey(display_name)",
    ).eq("booking_id", bookingId).order("step_code").order("created_at"),
  ])
  if (bookingResult.error || tasksResult.error) {
    throw new Error("Unable to load the booking checklist.")
  }
  return { booking: bookingResult.data, tasks: tasksResult.data }
}
