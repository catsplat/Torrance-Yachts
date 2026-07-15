import { z } from "zod"

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

const optionalText = (maximum: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2).max(maximum).optional(),
  )

const normaliseOptionalText = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "string") return value
  const normalised = value.trim()
  return normalised === "" ? undefined : normalised
}

const optionalEmail = z.preprocess(
  (value) => {
    const normalised = normaliseOptionalText(value)
    return typeof normalised === "string"
      ? normalised.toLocaleLowerCase("en-GB")
      : normalised
  },
  z.email("Enter a valid email address.").max(320).optional(),
)

const optionalPhone = z.preprocess(
  normaliseOptionalText,
  z
    .string()
    .trim()
    .regex(/^[+0-9][0-9 ()-]{6,31}$/, "Enter a valid phone number.")
    .optional(),
)

const checkboxValue = z.preprocess(
  (value) => value === "on" || value === "true",
  z.boolean(),
)

const activeValue = z.enum(["true", "false"]).transform((value) => value === "true")

export const contactRoleValues = [
  "customer",
  "charterer",
  "broker",
  "captain",
  "crew",
  "operations",
  "supplier",
  "other",
] as const

export const yachtResponsibilityValues = [
  "captain",
  "manager",
  "operations",
  "notification_recipient",
  "crew",
  "other",
] as const

export const contactFormSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the contact's name.").max(160),
  email: optionalEmail,
  phone: optionalPhone,
  roles: z
    .array(z.enum(contactRoleValues))
    .min(1, "Select at least one role.")
    .max(contactRoleValues.length)
    .transform((roles) => [...new Set(roles)]),
  active: activeValue,
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(5000).optional(),
  ),
})

export const companyFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the company name.").max(160),
  email: optionalEmail,
  phone: optionalPhone,
  website: z.preprocess(
    emptyToUndefined,
    z
      .url("Enter a complete website URL.")
      .max(500)
      .refine(
        (value) => value.startsWith("https://") || value.startsWith("http://"),
        "Website URLs must use HTTP or HTTPS.",
      )
      .optional(),
  ),
  active: activeValue,
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(5000).optional(),
  ),
})

export const companyAssignmentSchema = z.object({
  company_id: z.uuid("Choose a company."),
  job_title: optionalText(160),
  is_primary: checkboxValue,
})

export const yachtAssignmentSchema = z.object({
  yacht_id: z.uuid("Choose a yacht."),
  responsibility: z.enum(yachtResponsibilityValues),
  is_primary: checkboxValue,
  notifications_enabled: checkboxValue,
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1000).optional(),
  ),
})

export type ContactFormData = z.infer<typeof contactFormSchema>
export type CompanyFormData = z.infer<typeof companyFormSchema>

export function parseContactFormData(formData: FormData) {
  return contactFormSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roles: formData.getAll("roles"),
    active: formData.get("active"),
    notes: formData.get("notes"),
  })
}

export function parseCompanyFormData(formData: FormData) {
  return companyFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    active: formData.get("active"),
    notes: formData.get("notes"),
  })
}

export function parseCompanyAssignment(formData: FormData) {
  return companyAssignmentSchema.safeParse({
    company_id: formData.get("company_id"),
    job_title: formData.get("job_title"),
    is_primary: formData.get("is_primary"),
  })
}

export function parseYachtAssignment(formData: FormData) {
  return yachtAssignmentSchema.safeParse({
    yacht_id: formData.get("yacht_id"),
    responsibility: formData.get("responsibility"),
    is_primary: formData.get("is_primary"),
    notifications_enabled: formData.get("notifications_enabled"),
    notes: formData.get("notes"),
  })
}

export function normaliseDirectorySearch(value: string | undefined) {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100)
    .toLocaleLowerCase("en-GB")
}
