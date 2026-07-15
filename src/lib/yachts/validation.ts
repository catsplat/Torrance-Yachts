import { z } from "zod"

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

const optionalText = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2).max(maximum).optional(),
  )

const optionalPositiveNumber = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(maximum).optional(),
  )

const optionalPositiveInteger = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(maximum).optional(),
  )

export const yachtFormSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a yacht name.").max(120),
    builder: optionalText(120),
    year_built: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1900).max(2100).optional(),
    ),
    length_metres: optionalPositiveNumber(9999),
    beam_metres: optionalPositiveNumber(999),
    guest_capacity: optionalPositiveInteger(1000),
    cabin_count: optionalPositiveInteger(500),
    crew_count: optionalPositiveInteger(1000),
    cruise_speed_knots: optionalPositiveNumber(999),
    max_speed_knots: optionalPositiveNumber(999),
    home_port: optionalText(120),
    preferred_ports: z.preprocess(
      (value) =>
        typeof value === "string"
          ? value
              .split(",")
              .map((port) => port.trim())
              .filter(Boolean)
          : value,
      z.array(z.string().min(2).max(120)).max(20),
    ),
    notification_phone: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{7,32}$/, "Enter a valid operational phone number.")
        .optional(),
    ),
    status: z.enum(["active", "inactive", "maintenance"]),
    notes: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(5000).optional(),
    ),
  })
  .superRefine((data, context) => {
    if (
      data.cruise_speed_knots !== undefined &&
      data.max_speed_knots !== undefined &&
      data.max_speed_knots < data.cruise_speed_knots
    ) {
      context.addIssue({
        code: "custom",
        message: "Maximum speed cannot be below cruising speed.",
        path: ["max_speed_knots"],
      })
    }
  })

export type YachtFormData = z.infer<typeof yachtFormSchema>

export function parseYachtFormData(formData: FormData) {
  return yachtFormSchema.safeParse({
    name: formData.get("name"),
    builder: formData.get("builder"),
    year_built: formData.get("year_built"),
    length_metres: formData.get("length_metres"),
    beam_metres: formData.get("beam_metres"),
    guest_capacity: formData.get("guest_capacity"),
    cabin_count: formData.get("cabin_count"),
    crew_count: formData.get("crew_count"),
    cruise_speed_knots: formData.get("cruise_speed_knots"),
    max_speed_knots: formData.get("max_speed_knots"),
    home_port: formData.get("home_port"),
    preferred_ports: formData.get("preferred_ports"),
    notification_phone: formData.get("notification_phone"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  })
}
