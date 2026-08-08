import { z } from "zod"

import {
  taskDueAnchorValues,
  taskPriorityValues,
} from "./options"

const optionalUuid = z.string().trim().transform((value) => value || null).pipe(z.uuid().nullable())
const optionalDate = z.string().trim().transform((value) => value || null).pipe(z.iso.date().nullable())
const optionalInteger = (minimum: number, maximum: number) =>
  z.string().trim().transform((value) => value ? Number(value) : null)
    .pipe(z.number().int().min(minimum).max(maximum).nullable())

export const taskReasonSchema = z.object({
  reason: z.string().trim().min(2).max(2000),
})

export const taskScheduleSchema = z.object({
  due_date: optionalDate,
  assigned_user_id: optionalUuid,
  priority: z.enum(taskPriorityValues),
})

export const adHocTaskSchema = z.object({
  booking_id: z.uuid(),
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(5000).transform((value) => value || null),
  due_date: optionalDate,
  priority: z.enum(taskPriorityValues),
  assigned_user_id: optionalUuid,
})

export const taskNoteSchema = z.object({
  body: z.string().trim().min(2).max(10000),
})

export const cloneTemplateSchema = z.object({
  source_template_id: z.uuid(),
  name: z.string().trim().min(2).max(160),
})

export const templateStepSchema = z.object({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(5000).transform((value) => value || null),
  priority: z.enum(taskPriorityValues),
  required: z.string().optional().transform((value) => value === "on"),
  due_anchor: z.enum(taskDueAnchorValues),
  due_offset_days: z.coerce.number().int().min(-365).max(365),
  due_date_required: z.string().optional().transform((value) => value === "on"),
  reminder_lead_days: optionalInteger(0, 365),
  escalation_after_days: optionalInteger(0, 365),
}).refine((value) => !value.due_date_required || value.due_anchor !== "none", {
  message: "A required due date needs a date source.",
  path: ["due_anchor"],
})

export const newTemplateStepSchema = z.intersection(
  templateStepSchema,
  z.object({
    template_id: z.uuid(),
    step_code: z.string().trim().toUpperCase().regex(/^[0-9]+([.][0-9A-Z]+)?$/),
    sort_order: z.coerce.number().int().min(0).max(10000),
  }),
)

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
) {
  return schema.safeParse(Object.fromEntries(formData)) as z.ZodSafeParseResult<z.infer<T>>
}
