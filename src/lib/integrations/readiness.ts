import "server-only"

import { getAiConfigurationSummary } from "@/lib/ai/config"
import { deriveGmailIngestionState, type ActivationState } from "@/lib/integrations/readiness-rules"
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

async function n8nState(): Promise<Pick<ActivationCheck, "detail" | "state">> {
  const healthUrl = process.env.N8N_HEALTH_URL?.trim()
  if (!healthUrl) return { detail: "Set N8N_HEALTH_URL to the private /healthz endpoint, then activate reviewed workflows explicitly.", state: "setup_required" }
  try {
    const response = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(3_000) })
    return response.ok
      ? { detail: "The private n8n health endpoint responded. Workflow activation is still an explicit operator decision.", state: "ready" }
      : { detail: "The n8n health endpoint did not report ready. Review the container and workflow logs.", state: "attention" }
  } catch {
    return { detail: "The n8n health endpoint could not be reached from the application container.", state: "attention" }
  }
}

export async function getIntegrationActivationChecks(): Promise<ActivationCheck[]> {
  const admin = createAdminClient()
  const [snapshotResult, n8n] = await Promise.all([
    admin.rpc("get_activation_readiness_snapshot"),
    n8nState(),
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
    ingestionTokenConfigured: Boolean(process.env.EMAIL_INGESTION_TOKEN?.trim()),
    lastReceivedAt: snapshot.last_email_received_at,
  })
  const ai = getAiConfigurationSummary()
  const production = process.env.APP_ENVIRONMENT === "production"
  const smtpReady = production ? process.env.AUTH_SMTP_CONFIGURED === "true" : true
  const telegramReady = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) && Boolean(telegramConnection?.enabled) && snapshot.telegram_user_count > 0
  const aiReady = ai.enabled && (!production || ai.provider !== "local")

  return [
    {
      description: "Incoming Gmail is submitted by n8n through the authenticated ingestion boundary.",
      detail: gmailState === "ready" ? `A message was ingested at ${new Date(snapshot.last_email_received_at!).toLocaleString("en-GB")}.` : gmailState === "attention" ? "Configuration is present, but no Gmail message has been received in the last seven days. Send a synthetic test enquiry and verify Inbox routing." : "Enable the Gmail adapter, configure the ingestion token, and test with synthetic mail before using live enquiries.",
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
    { description: "Self-hosted n8n performs scheduled and provider-specific adapter work.", detail: n8n.detail, key: "n8n", state: n8n.state, title: "Automation worker" },
    {
      description: "Supabase Auth sends invitations and password recovery mail.",
      detail: production ? (smtpReady ? "Production SMTP is operator-confirmed. Complete an invitation and recovery delivery test before approval." : "Configure production SMTP outside the web app, then set AUTH_SMTP_CONFIGURED=true only after delivery is verified.") : "Local Auth mail is captured safely by Mailpit at http://127.0.0.1:54324.",
      key: "auth_email",
      state: smtpReady ? "ready" : "setup_required",
      title: "Account email delivery",
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
