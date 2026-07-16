"use server"

import { revalidatePath } from "next/cache"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  internalUserInviteSchema,
  internalUserUpdateSchema,
  recoveryEmailSchema,
} from "@/lib/users/validation"

export type UserAdminActionState = {
  message?: string
  success?: boolean
}

const expired = { message: "Your session has expired. Sign in again." }

async function administratorContext() {
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  if (context.role !== "administrator") return { message: "Administrator access is required." }
  return context
}

function applicationBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
}

export async function updateInternalUserAction(
  _state: UserAdminActionState,
  formData: FormData,
): Promise<UserAdminActionState> {
  const parsed = internalUserUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Review the user details." }
  const context = await administratorContext()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_internal_user", {
    p_active: parsed.data.active,
    p_display_name: parsed.data.displayName,
    p_phone: parsed.data.phone,
    p_reason: parsed.data.reason,
    p_role: parsed.data.role,
    p_telegram_chat_id: parsed.data.telegramChatId,
    p_user_id: parsed.data.userId,
  })
  if (error) return { message: error.message.includes("recovery access") ? error.message : "The internal user could not be updated." }
  revalidatePath("/settings/users")
  return { message: "Internal user updated with audit history.", success: true }
}

export async function inviteInternalUserAction(
  _state: UserAdminActionState,
  formData: FormData,
): Promise<UserAdminActionState> {
  const parsed = internalUserInviteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Enter a valid name and email address." }
  const context = await administratorContext()
  if ("message" in context) return context
  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { display_name: parsed.data.displayName },
      redirectTo: `${applicationBaseUrl()}/auth/callback?next=/account/update-password`,
    })
    if (error) return { message: "The invitation could not be sent. Check SMTP and whether the account already exists." }
    return { message: "Invitation email requested. Confirm delivery before granting operational work.", success: true }
  } catch {
    return { message: "The production Auth administrator is not configured." }
  }
}

export async function sendRecoveryEmailAction(
  _state: UserAdminActionState,
  formData: FormData,
): Promise<UserAdminActionState> {
  const parsed = recoveryEmailSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Enter a valid email and recovery reason." }
  const context = await administratorContext()
  if ("message" in context) return context
  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${applicationBaseUrl()}/auth/callback?next=/account/update-password`,
    })
    if (error) return { message: "The recovery email could not be requested. Check SMTP and rate limits." }
    return { message: "Recovery email requested without revealing account status.", success: true }
  } catch {
    return { message: "The production Auth administrator is not configured." }
  }
}
