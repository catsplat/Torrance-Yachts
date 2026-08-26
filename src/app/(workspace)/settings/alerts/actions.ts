"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  alertPreferencesSchema,
  gmailOauthCredentialsSchema,
  gmailOauthDisconnectSchema,
  googleSpreadsheetSelectionSchema,
} from "@/lib/alerts/validation"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { testImapMailboxConnection } from "@/lib/emails/imap"
import {
  listGoogleSpreadsheets,
  safeGoogleConnectionMessage,
} from "@/lib/integrations/google-workspace"
import { getActiveGoogleWorkspaceDispatchCredentials } from "@/lib/integrations/google-workspace-server"
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

const imapConnectionSchema = z.object({
  accountEmail: z.email().transform((value) => value.toLowerCase()),
  appPassword: z.string().min(8).max(512),
  enabled: z.literal("on").optional().transform(Boolean),
  folders: z.string().trim().min(1).max(1_000).transform((value) =>
    [...new Set(value.split(",").map((folder) => folder.trim()).filter(Boolean))].slice(0, 12),
  ),
  host: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]{3,253}$/),
  port: z.coerce.number().int().min(1).max(65_535),
  tls: z.literal("on").optional().transform(Boolean),
})

export async function saveMyImapMailboxAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const parsed = imapConnectionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "Review the IMAP account, app password, server and folder details." }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  try {
    const tested = await testImapMailboxConnection({
      accountEmail: parsed.data.accountEmail,
      appPassword: parsed.data.appPassword,
      host: parsed.data.host,
      port: parsed.data.port,
      tls: parsed.data.tls,
    })
    if (!tested.ok) return { message: tested.detail }
    const { error } = await context.supabase.rpc("save_my_imap_mailbox_connection", {
      p_account_email: parsed.data.accountEmail,
      p_app_password: parsed.data.appPassword,
      p_enabled: parsed.data.enabled,
      p_folders: parsed.data.folders,
      p_host: parsed.data.host,
      p_port: parsed.data.port,
      p_tls: parsed.data.tls,
    })
    if (error) return { message: "The mailbox could not be saved securely." }
    revalidatePath("/settings/alerts")
    return { message: `Secure IMAP connection saved (${tested.latencyMs} ms).`, success: true }
  } catch {
    return { message: "The IMAP server could not be reached. Check the provider’s app-password and IMAP settings." }
  }
}

export async function disconnectMyImapMailboxAction(
  _state: AlertSettingsActionState,
  formData: FormData,
): Promise<AlertSettingsActionState> {
  const connectionId = z.uuid().safeParse(formData.get("connectionId"))
  if (!connectionId.success) return { message: "The mailbox reference is invalid." }
  const context = await getAuthenticatedRequestContext()
  if (!context) return expired
  const { error } = await context.supabase.rpc("disconnect_my_imap_mailbox_connection", { p_connection_id: connectionId.data })
  if (error) return { message: "The IMAP mailbox could not be disconnected." }
  revalidatePath("/settings/alerts")
  return { message: "IMAP mailbox disconnected and its app password removed.", success: true }
}

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
    const [{ data: connections, error: connectionError }, { data: imapConnections, error: imapError }] = await Promise.all([
      context.supabase.rpc("get_my_oauth_connections"),
      context.supabase.from("imap_mailbox_connections").select("id").eq("enabled", true).eq("status", "connected").limit(1),
    ])
    const gmailConnected = connections?.some(
      (connection) => connection.provider === "gmail" && connection.status === "connected",
    )
    if (connectionError || imapError || (!gmailConnected && !imapConnections?.length)) {
      return { message: "Connect a Google or IMAP mailbox before turning on email alerts." }
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
    const credentials = await getActiveGoogleWorkspaceDispatchCredentials()
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
    return { message: safeGoogleConnectionMessage(error, "Google Sheets could not be loaded.") }
  }

  revalidatePath("/settings/alerts")
  revalidatePath("/settings/integrations")
  revalidatePath("/settings/activation")
  return { message: "Reporting spreadsheet selected.", success: true }
}
