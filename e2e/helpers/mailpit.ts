type MailpitMessageSummary = {
  ID: string
  To?: Array<{ Address?: string }>
}

type MailpitMessage = {
  HTML?: string
  Text?: string
}

type ConfirmationType = "invite" | "recovery"

const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324"

function hasRecipient(message: MailpitMessageSummary, recipient: string) {
  return message.To?.some((address) => address.Address?.toLowerCase() === recipient.toLowerCase()) ?? false
}

function findConfirmationLink(message: MailpitMessage, type: ConfirmationType) {
  const content = `${message.HTML ?? ""}\n${message.Text ?? ""}`.replaceAll("&amp;", "&")
  const candidates = content.match(/https?:\/\/[^\s"'<>)]*/g) ?? []

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (url.pathname === "/auth/confirm" && url.searchParams.get("type") === type) return url
    } catch {
      // Ignore non-URL text that happens to resemble a link in an email body.
    }
  }

  return null
}

/**
 * Wait for an isolated local Auth email without writing its one-time token to
 * test output. The unique example.test recipient makes this safe for parallel
 * development mail already held by Mailpit.
 */
export async function waitForMailpitConfirmationLink(
  recipient: string,
  type: ConfirmationType,
  timeoutMs = 30_000,
) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`)
    if (!listResponse.ok) throw new Error("Local Mailpit is unavailable.")
    const list = await listResponse.json() as { messages?: MailpitMessageSummary[] }
    const messages = list.messages?.filter((message) => hasRecipient(message, recipient)) ?? []

    for (const summary of messages) {
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${encodeURIComponent(summary.ID)}`)
      if (!detailResponse.ok) continue
      const message = await detailResponse.json() as MailpitMessage
      const link = findConfirmationLink(message, type)
      if (link) return link
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for local ${type} confirmation email.`)
}
