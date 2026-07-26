# ADR 0018: Local offline assurance before provider activation

**Status:** Accepted

## Context

The application can be run locally with Docker Desktop, local Supabase, local
n8n Community Edition, and Ollama. Connecting a mailbox, Telegram bot,
calendar, Drive, Sheets, Yachtfolio, cloud AI account, or client documents
before the operational boundaries are rehearsed would make failure analysis and
privacy controls needlessly difficult.

## Decision

Use an administrator-only **Settings -> Offline workflow rehearsal** page in
the development environment. It injects clearly labelled fictional email
fixtures through the same Gmail validation and database-ingestion command used
by the live adapter. It supplies a local Ollama proposal only; all enquiry,
offer, booking, document, notification, and provider decisions retain their
ordinary human-approval command.

The local n8n instance is bound to loopback and imports inactive workflows.
Only its version-controlled development delivery simulator may be manually run
for a rehearsal. It uses the claim/complete/fail application contract and has
no Gmail, Telegram, Drive, Calendar, Sheets, Yachtfolio, or external-recipient
node.

## Consequences

- Replays use stable fictional provider identifiers and therefore prove that
  retries cannot duplicate business data.
- A model timeout, malformed payload, or unavailable model is visible as a
  failed analysis and cannot leak into a workflow command.
- Local demonstration records remain visibly fictional and may be retained for
  audit evidence. A clean `npm run db:reset` is permitted only for the local
  synthetic development database; it is never a production operating action.
- Document uploads remain private and validation-tested, but real identity
  documents are prohibited until a production scanning/quarantine service and
  retention policy are approved.
- A passing local rehearsal is evidence of internal correctness, not evidence
  that any live provider integration is commissioned.
