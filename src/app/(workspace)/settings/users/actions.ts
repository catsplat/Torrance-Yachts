"use server"

import { revalidatePath } from "next/cache"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  internalUserInviteSchema,
  internalUserUpdateSchema,
  recoveryEmailSchema,
  resetMfaSchema,
} from "@/lib/users/validation"

export type UserAdminActionState = {
  link?: string
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

function passwordSetupRedirectUrl() {
  return `${applicationBaseUrl()}/auth/confirm?next=/account/update-password`
}

function manualAuthActionLink(type: "invite" | "recovery", tokenHash: string) {
  const link = new URL("/auth/confirm", applicationBaseUrl())
  link.searchParams.set("token_hash", tokenHash)
  link.searchParams.set("type", type)
  link.searchParams.set("next", "/account/update-password")
  return link.toString()
}

export async function resetUserMfaAction(
  _state: UserAdminActionState,
  formData: FormData,
): Promise<UserAdminActionState> {
  const parsed = resetMfaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Give a reason of at least 10 characters." }
  const context = await administratorContext()
  if ("message" in context) return context
  if (parsed.data.userId === context.userId) {
    return { message: "Another administrator must reset your authenticator." }
  }
  try {
    const admin = createAdminClient()
    const factors = await admin.auth.admin.mfa.listFactors({ userId: parsed.data.userId })
    if (factors.error) return { message: "Authenticator factors could not be loaded." }
    for (const factor of factors.data.factors) {
      const removal = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: parsed.data.userId })
      if (removal.error) return { message: "Authenticator reset did not complete safely." }
    }
    const audit = await admin.from("audit_events").insert({
      action: "update", actor_user_id: context.userId, entity_id: parsed.data.userId,
      entity_type: "profile_mfa", new_values: { factor_count: 0, reason: parsed.data.reason },
      old_values: { factor_count: factors.data.factors.length }, source: "application.mfa_reset",
    })
    if (audit.error) return { message: "Authenticator factors were reset, but audit recording failed. Review the audit log immediately." }
    revalidatePath("/settings/users")
    return { message: "Authenticator reset. The user must enrol again.", success: true }
  } catch {
    return { message: "The trusted Auth administrator is not configured." }
  }
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
    p_reason: "Account details updated by an administrator",
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
    const invitation = await admin.auth.admin.generateLink({
      type: "invite",
      email: parsed.data.email,
      options: {
      data: { display_name: parsed.data.displayName },
      redirectTo: passwordSetupRedirectUrl(),
      },
    })
    if (invitation.error || !invitation.data.user || !invitation.data.properties?.hashed_token) {
      return { message: "The invitation link could not be generated. Check that the account does not already exist." }
    }
    const approval = await admin.rpc("approve_internal_user_invitation", {
      p_approved_by: context.userId,
      p_user_id: invitation.data.user.id,
    })
    if (approval.error || !approval.data) {
      await admin.auth.admin.deleteUser(invitation.data.user.id)
      return { message: "The invitation could not be approved safely. No usable account was retained." }
    }
    revalidatePath("/settings/users")
    return { link: manualAuthActionLink("invite", invitation.data.properties.hashed_token), message: "Invitation link generated. Send it to the invitee through a secure channel.", success: true }
  } catch {
    return { message: "The production Auth administrator is not configured." }
  }
}

export async function sendRecoveryEmailAction(
  _state: UserAdminActionState,
  formData: FormData,
): Promise<UserAdminActionState> {
  const parsed = recoveryEmailSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Enter a valid email address." }
  const context = await administratorContext()
  if ("message" in context) return context
  try {
    const admin = createAdminClient()
    const recovery = await admin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
      options: { redirectTo: passwordSetupRedirectUrl() },
    })
    if (recovery.error || !recovery.data.properties?.hashed_token) return { message: "The recovery link could not be generated." }
    return { link: manualAuthActionLink("recovery", recovery.data.properties.hashed_token), message: "Recovery link generated. Send it to the user through a secure channel.", success: true }
  } catch {
    return { message: "The production Auth administrator is not configured." }
  }
}
