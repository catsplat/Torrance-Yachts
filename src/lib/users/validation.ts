import { z } from "zod"

const optionalText = (maximum: number) =>
  z.union([z.literal(""), z.string().trim().min(2).max(maximum)])

export const internalUserUpdateSchema = z.object({
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  displayName: z.string().trim().min(2).max(100),
  phone: optionalText(32),
  reason: z.string().trim().min(2).max(2000),
  role: z.enum(["administrator", "staff"]),
  telegramChatId: optionalText(64),
  userId: z.uuid(),
})

export const internalUserInviteSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
})

export const recoveryEmailSchema = z.object({
  email: z.email().trim().toLowerCase(),
  reason: z.string().trim().min(2).max(1000),
})

export const passwordUpdateSchema = z.object({
  confirmPassword: z.string(),
  password: z.string().min(12).max(256)
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[0-9]/, "Include a number.")
    .regex(/[^A-Za-z0-9]/, "Include a symbol."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
})
