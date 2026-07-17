export type ActivationState = "attention" | "manual" | "ready" | "setup_required"

export function deriveGmailIngestionState({
  connectionEnabled,
  ingestionTokenConfigured,
  lastReceivedAt,
  now = new Date(),
}: {
  connectionEnabled: boolean
  ingestionTokenConfigured: boolean
  lastReceivedAt: string | null
  now?: Date
}): ActivationState {
  if (!connectionEnabled || !ingestionTokenConfigured) return "setup_required"
  if (!lastReceivedAt) return "attention"
  const lastReceived = new Date(lastReceivedAt)
  if (Number.isNaN(lastReceived.getTime())) return "attention"
  return now.getTime() - lastReceived.getTime() <= 7 * 86_400_000 ? "ready" : "attention"
}
