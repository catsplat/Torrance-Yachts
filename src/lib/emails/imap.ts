import "server-only"

import { ImapFlow } from "imapflow"

import { normaliseImapMessage } from "./imap-normalise"

export { normaliseImapMessage } from "./imap-normalise"

export type ImapMailboxCredentials = {
  accountEmail: string
  host: string
  port: number
  tls: boolean
  appPassword: string
}


function createClient(credentials: ImapMailboxCredentials) {
  return new ImapFlow({
    auth: { user: credentials.accountEmail, pass: credentials.appPassword },
    host: credentials.host,
    port: credentials.port,
    secure: credentials.tls,
    tls: { minVersion: "TLSv1.2" },
    logger: false,
  })
}

export async function testImapMailboxConnection(credentials: ImapMailboxCredentials) {
  const client = createClient(credentials)
  const startedAt = Date.now()
  try {
    await client.connect()
    await client.mailboxOpen("INBOX", { readOnly: true })
    return { detail: "Secure IMAP connection succeeded.", latencyMs: Date.now() - startedAt, ok: true }
  } finally {
    await client.logout().catch(() => undefined)
  }
}

export async function reconcileImapMailbox({
  connectionId,
  credentials,
  folder = "INBOX",
  ingest,
  lastUid,
  lastUidValidity,
}: {
  connectionId: string
  credentials: ImapMailboxCredentials
  folder?: string
  ingest: (message: ReturnType<typeof normaliseImapMessage>) => Promise<unknown>
  lastUid: number | null
  lastUidValidity: string | null
}) {
  const client = createClient(credentials)
  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder, { readOnly: true })
    try {
      if (!client.mailbox) throw new Error(`IMAP folder ${folder} could not be opened.`)
      const uidValidity = String(client.mailbox.uidValidity ?? "unknown")
      const startUid = lastUidValidity === uidValidity && lastUid ? lastUid + 1 : 1
      let processed = 0
      let nextUid = lastUid ?? 0
      for await (const message of client.fetch(`${startUid}:*`, { flags: true, internalDate: true, source: true, uid: true }, { uid: true })) {
        if (processed >= 25) break
        if (!message.source || !message.internalDate || !message.uid) continue
        await ingest(normaliseImapMessage({
          accountEmail: credentials.accountEmail,
          connectionId,
          flags: message.flags ?? new Set<string>(),
          folder,
          internalDate: typeof message.internalDate === "string" ? new Date(message.internalDate) : message.internalDate,
          source: Buffer.from(message.source),
          uid: message.uid,
          uidValidity,
        }))
        nextUid = Math.max(nextUid, message.uid)
        processed += 1
      }
      return { lastUid: nextUid, processed, uidValidity }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }
}

export async function applyImapMailboxAction({
  action,
  credentials,
  folder,
  uid,
}: {
  action: "archive" | "mark_read"
  credentials: ImapMailboxCredentials
  folder: string
  uid: number
}) {
  const client = createClient(credentials)
  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder)
    try {
      if (action === "mark_read") {
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true })
      } else {
        // IMAP's \Archive special-use folder is not universal. "Archive" is the
        // broadly supported default; a failure is retained for staff recovery.
        await client.messageMove(String(uid), "Archive", { uid: true })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }
}
