"use server"

import { redirect } from "next/navigation"

import { setupTokenMatches } from "@/lib/auth/initial-setup-token"
import { createAdminClient } from "@/lib/supabase/admin"
import { consumeRateLimit } from "@/lib/security/rate-limit"
import { initialAdministratorSetupSchema } from "@/lib/users/validation"

export type InitialAdministratorSetupState = {
  message?: string
}

async function removeIncompleteUser(userId: string) {
  try {
    await createAdminClient().auth.admin.deleteUser(userId)
  } catch {
    // The original failure is returned without exposing trusted-service details.
  }
}

export async function createInitialAdministratorAction(
  _state: InitialAdministratorSetupState,
  formData: FormData,
): Promise<InitialAdministratorSetupState> {
  if (!await consumeRateLimit("initial_setup", 5, 3600)) {
    return { message: "Setup attempt limit reached. Wait before trying again." }
  }
  const parsed = initialAdministratorSetupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Review the setup details." }
  }
  if (!setupTokenMatches(parsed.data.setupToken, process.env.INITIAL_ADMIN_SETUP_TOKEN)) {
    return { message: "The one-time setup token is invalid or setup is unavailable." }
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return { message: "Initial setup is not available because the trusted database connection is not configured." }
  }
  const before = await admin.rpc("get_initial_setup_profile_count")
  if (before.error || Number(before.data) !== 0) {
    return { message: "Initial setup is no longer available. Sign in or contact the operator." }
  }

  const created = await admin.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    password: parsed.data.password,
    user_metadata: {
      _initial_setup_pending: "true",
      display_name: parsed.data.displayName,
    },
  })
  if (created.error || !created.data.user) {
    return { message: "The administrator account could not be created. Review the email and try again." }
  }
  const userId = created.data.user.id

  const completed = await admin.rpc("complete_initial_administrator", {
    p_display_name: parsed.data.displayName,
    p_phone: parsed.data.phone,
    p_telegram_chat_id: parsed.data.telegramChatId,
    p_user_id: userId,
  })
  if (completed.error || !completed.data) {
    await removeIncompleteUser(userId)
    return { message: "Initial setup could not be completed or another request finished first. No additional active account was retained." }
  }

  redirect("/login?setup=complete")
}
