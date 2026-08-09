import { z } from "zod"

const optionalPhone = z.union([z.literal(""), z.string().trim().min(7).max(32)])
const optionalTelegramChatId = z.union([z.literal(""), z.string().trim().min(1).max(64)])

export const internalUserUpdateSchema = z.object({
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  displayName: z.string().trim().min(2).max(100),
  phone: optionalPhone,
  role: z.enum(["administrator", "staff"]),
  telegramChatId: optionalTelegramChatId,
  userId: z.uuid(),
})

export const internalUserInviteSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
})

export const recoveryEmailSchema = z.object({
  email: z.email().trim().toLowerCase(),
})

export const resetMfaSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
  userId: z.uuid(),
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

export const initialAdministratorSetupSchema = z.object({
  confirmPassword: z.string(),
  displayName: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(256)
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[0-9]/, "Include a number.")
    .regex(/[^A-Za-z0-9]/, "Include a symbol."),
  phone: optionalPhone,
  setupToken: z.string().trim().min(32).max(512),
  telegramChatId: optionalTelegramChatId,
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
})
