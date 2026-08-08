"use server"

import { revalidatePath } from "next/cache"

import {
  alertPreferencesSchema,
  gmailOauthCredentialsSchema,
  gmailOauthDisconnectSchema,
  googleSpreadsheetSelectionSchema,
} from "@/lib/alerts/validation"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  listGoogleSpreadsheets,
} from "@/lib/integrations/google-workspace"
import { getGoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace-server"
import {
  createTelegramPairingToken,
  createTelegramPairingUrl,
  getTelegramPairingConfiguration,
  hashTelegramPairingToken,
} from "@/lib/integrations/telegram-pairing"

export type AlertSettingsActionState = {
  message?: string
  pairingUrl?: string
  success?: boolean
}

const expired = { message: "Your session has expired. Sign in again." }

export async function createMyTelegramPairingAction(
  _state: AlertSettingsActionState,
  _formData: FormData,
): Promise<AlertSettingsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const configuration = getTelegramPairingConfiguration()
  if (!configuration.configured) {
    return { message: "Telegram pairing is not configured for this workspace yet." }
  }
  const token = createTelegramPairingToken()
  const { error } = await context.supabase.rpc("create_my_telegram_pairing_request", {
    p_token_hash: hashTelegramPairingToken(token),
  })
  if (error) return { message: "A secure Telegram pairing link could not be created." }
  return {
    message: "Open the company bot and press Start within 10 minutes. This link is private to you.",
    pairingUrl: createTelegramPairingUrl(configuration.botUsername, token),
    success: true,
  }
}

export async function updateMyAlertPreferencesAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const parsed = alertPreferencesSchema.safeParse({
    ...Object.fromEntries(formData),
    reason: "Updated personal alert preferences",
  })
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Review your alert settings." }
  }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const values = parsed.data
  if (values.emailEnabled) {
    const { data: connections, error: connectionError } = await context.supabase.rpc(
      "get_my_oauth_connections",
    )
    const gmailConnected = connections?.some(
      (connection) => connection.provider === "gmail" && connection.status === "connected",
    )
    if (connectionError || !gmailConnected) {
      return { message: "Connect a Google inbox before turning on email alerts." }
    }
  }
  const { error } = await context.supabase.rpc("update_my_alert_preferences", {
    p_ai_summary_enabled: values.aiSummaryEnabled,
    p_charter_enabled: values.charterEnabled,
    p_email_enabled: values.emailEnabled,
    p_follow_up_enabled: values.followUpEnabled,
    p_in_app_enabled: values.inAppEnabled,
    p_integration_failure_enabled: values.integrationFailureEnabled,
    p_internal_email_enabled: values.internalEmailEnabled,
    p_new_enquiry_enabled: values.newEnquiryEnabled,
    p_notification_email: values.notificationEmail,
    p_payment_enabled: values.paymentEnabled,
    p_phone: values.phone,
    p_reason: values.reason,
    p_task_enabled: values.taskEnabled,
    p_telegram_chat_id: values.telegramChatId,
    p_telegram_enabled: values.telegramEnabled,
    p_unknown_email_enabled: values.unknownEmailEnabled,
  })
  if (error) return { message: "Your alert settings could not be saved." }
  revalidatePath("/", "layout")
  revalidatePath("/settings/alerts")
  return { message: "Your personal alert routes and topics were updated.", success: true }
}

export async function saveMyGmailOauthAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const parsed = gmailOauthCredentialsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Review the OAuth credentials." }
  }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("save_my_gmail_oauth_credentials", {
    p_account_email: parsed.data.accountEmail,
    p_client_id: parsed.data.clientId,
    p_client_secret: parsed.data.clientSecret,
    p_reason: parsed.data.reason,
    p_refresh_token: parsed.data.refreshToken,
    p_scopes: parsed.data.scopes
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  })
  if (error) return { message: "The Gmail OAuth credentials could not be stored." }
  revalidatePath("/settings/alerts")
  return {
    message: "Gmail OAuth credentials were encrypted and connected to your account.",
    success: true,
  }
}

export async function disconnectMyGmailOauthAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const parsed = gmailOauthDisconnectSchema.safeParse({
    ...Object.fromEntries(formData),
    reason: "Disconnected Google Workspace from personal settings",
  })
  if (!parsed.success) return { message: "Enter a disconnect reason." }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("disconnect_my_gmail_oauth", {
    p_reason: parsed.data.reason,
  })
  if (error) return { message: "The Gmail connection could not be disconnected." }
  revalidatePath("/settings/alerts")
  return { message: "Gmail OAuth credentials were removed from Vault.", success: true }
}

export async function selectGoogleSpreadsheetAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const parsed = googleSpreadsheetSelectionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Choose a spreadsheet." }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  if (context.role !== "administrator") return { message: "Administrator access is required." }

  try {
    const credentials = await getGoogleWorkspaceCredentials(context.userId)
    const spreadsheets = await listGoogleSpreadsheets(credentials)
    const selected = spreadsheets.find((sheet) => sheet.id === parsed.data.spreadsheetId)
    if (!selected || selected.name !== parsed.data.spreadsheetName) {
      return { message: "That spreadsheet is no longer available. Refresh the list." }
    }
    const { error } = await context.supabase.rpc("update_integration_connection", {
      p_configuration_notes: `Selected spreadsheet: ${selected.name}`,
      p_enabled: true,
      p_provider: "google_sheets",
      p_target_reference: selected.id,
    })
    if (error) return { message: "The reporting spreadsheet could not be saved." }
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Google Sheets could not be loaded." }
  }

  revalidatePath("/settings/alerts")
  revalidatePath("/settings/integrations")
  revalidatePath("/settings/activation")
  return { message: "Reporting spreadsheet selected.", success: true }
}
