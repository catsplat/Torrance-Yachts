import "server-only"

import { getAiConfigurationSummary } from "@/lib/ai/config"
import {
  deriveAutomationRuntimeState,
  deriveGmailIngestionState,
  type ActivationState,
} from "@/lib/integrations/readiness-rules"
import { createAdminClient } from "@/lib/supabase/admin"

export type ActivationCheck = {
  description: string
  detail: string
  key: string
  state: ActivationState
  title: string
}

type ActivationSnapshot = {
  connections: Record<string, { enabled: boolean; last_failure_at: string | null; last_success_at: string | null }>
  gmail_user_count: number
  last_email_received_at: string | null
  telegram_user_count: number
}

function applicationEnvironment(): "development" | "staging" | "production" {
  if (process.env.APP_ENVIRONMENT === "production") return "production"
  if (process.env.APP_ENVIRONMENT === "staging") return "staging"
  return "development"
}

async function checkDevelopmentN8nHealth(): Promise<Pick<ActivationCheck, "detail" | "state">> {
  const healthUrl = process.env.N8N_HEALTH_URL?.trim()
  if (!healthUrl) return { detail: "Local n8n is optional for development rehearsal and is not running.", state: "setup_required" }
  try {
    const response = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(3_000) })
    return response.ok
      ? { detail: "Local n8n rehearsal is available.", state: "ready" }
      : { detail: "Local n8n rehearsal is not ready. Review its container and workflow logs.", state: "attention" }
  } catch {
    return { detail: "Local n8n rehearsal could not be reached from the application.", state: "attention" }
  }
}

export async function checkAutomationHealth(): Promise<Pick<ActivationCheck, "detail" | "state">> {
  const environment = applicationEnvironment()
  const state = deriveAutomationRuntimeState({
    environment,
    sharedSecretConfigured: Boolean(process.env.AUTOMATION_SHARED_SECRET?.trim()),
  })
  if (environment === "development") return checkDevelopmentN8nHealth()
  return state === "ready"
    ? { detail: "The application worker processes queues every minute; its container heartbeat is checked by the hosted runtime monitor.", state }
    : { detail: "The application worker is not configured. Set its protected automation secret before deployment.", state }
}

export async function getIntegrationActivationChecks(): Promise<ActivationCheck[]> {
  const admin = createAdminClient()
  const [snapshotResult, automation] = await Promise.all([
    admin.rpc("get_activation_readiness_snapshot"),
    checkAutomationHealth(),
  ])
  if (snapshotResult.error || !snapshotResult.data) {
    throw new Error("Integration activation status could not be loaded.")
  }
  const snapshot = snapshotResult.data as ActivationSnapshot
  const connection = (provider: string) => snapshot.connections[provider]
  const gmailConnection = connection("gmail")
  const telegramConnection = connection("telegram")
  const gmailState = deriveGmailIngestionState({
    connectionEnabled: Boolean(gmailConnection?.enabled),
    ingestionTokenConfigured: snapshot.gmail_user_count > 0,
    lastReceivedAt: snapshot.last_email_received_at,
  })
  const ai = getAiConfigurationSummary()
  const production = process.env.APP_ENVIRONMENT === "production"
  const smtpReady = production ? process.env.AUTH_SMTP_CONFIGURED === "true" : true
  const manualLinksReady = process.env.AUTH_MANUAL_LINKS_ENABLED === "true"
  const authEmailReady = smtpReady || manualLinksReady
  const telegramReady = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) && Boolean(telegramConnection?.enabled) && snapshot.telegram_user_count > 0
  const aiReady = ai.enabled && (!production || ai.provider !== "local")

  return [
    {
      description: "The selected staff Google connection supplies the shared inbox securely.",
      detail: gmailState === "ready" ? `A message was ingested at ${new Date(snapshot.last_email_received_at!).toLocaleString("en-GB")}.` : gmailState === "attention" ? "The mailbox is connected, but no recent message has been received. Run a synthetic inbox test." : "Connect Google, select the shared inbox, and run a synthetic inbox test.",
      key: "gmail_ingestion",
      state: gmailState,
      title: "Gmail ingestion",
    },
    {
      description: "Staff email alerts use each employee's encrypted Gmail OAuth connection.",
      detail: snapshot.gmail_user_count > 0 ? `${snapshot.gmail_user_count} active Gmail connection${snapshot.gmail_user_count === 1 ? "" : "s"} stored in Supabase Vault.` : "Each staff member who wants email alerts must connect Gmail under My alerts and connections.",
      key: "staff_email",
      state: snapshot.gmail_user_count > 0 ? "ready" : "setup_required",
      title: "Staff email alerts",
    },
    {
      description: "One server-held bot token routes alerts to staff-owned chat IDs.",
      detail: telegramReady ? `${snapshot.telegram_user_count} active staff destination${snapshot.telegram_user_count === 1 ? "" : "s"} available.` : "Configure the company bot token, enable Telegram, and add at least one staff chat ID before sending a synthetic test alert.",
      key: "telegram",
      state: telegramReady ? "ready" : "setup_required",
      title: "Telegram alerts",
    },
    { description: "The application-owned worker processes queues; local n8n remains available only for development rehearsal.", detail: automation.detail, key: "automation", state: automation.state, title: "Automation scheduler" },
    {
      description: "Invitations and recovery use verified Supabase action links.",
      detail: production ? (manualLinksReady ? "Manual single-use links are enabled. Administrators generate and send them through a secure channel." : smtpReady ? "Production SMTP is operator-confirmed. Complete invitation and recovery delivery tests before approval." : "Enable manual action links or configure production SMTP before inviting staff.") : "Local Auth mail is captured safely by Mailpit at http://127.0.0.1:54324; manual links are also available.",
      key: "auth_email",
      state: authEmailReady ? "ready" : "setup_required",
      title: "Account access",
    },
    {
      description: "AI extracts, summarises, and drafts; people approve every consequential action.",
      detail: aiReady ? `${ai.provider} / ${ai.model} is configured.` : production && ai.provider === "local" ? "The deterministic local provider is for development tests. Configure the approved production provider and server-only credential." : "Configure an approved provider and server-only credential. The deterministic local provider remains available for development.",
      key: "ai",
      state: aiReady ? "ready" : "setup_required",
      title: "AI assistance",
    },
    {
      description: "Yachtfolio has no approved write API in this project.",
      detail: "Booked-date entry remains a named human task with a reason, completion evidence, and workflow audit history. This is intentional.",
      key: "yachtfolio",
      state: "manual",
      title: "Yachtfolio booked dates",
    },
  ]
}
