# ADR 0022: Gmail is connected through credential-free n8n adapters

**Status:** Accepted

**Date:** 27 July 2026

## Context

The application already had a validated/idempotent Gmail ingestion command and
provider-action outbox, but the repository did not contain the actual Gmail
Trigger, mark-read or archive workflows. Phase labels and adapter contracts were
therefore not sufficient evidence of an operable mailbox boundary.

## Decision

- Keep message normalisation, validation, idempotency and all business decisions
  in the application/PostgreSQL boundary.
- Use an inactive n8n Gmail Trigger only to obtain full message data and post it
  to the authenticated application endpoint. Do not download attachments.
- Use separate capability-scoped mark-read and archive workers so a Gmail worker
  cannot lease unrelated Calendar, Drive or Sheets work.
- Import every workflow without credentials. A client-owned Google credential is
  assigned and activated only during staged acceptance.
- Continue to require human approval before an enquiry, offer, booking, external
  notification or Gmail draft becomes consequential.

## Consequences

The mailbox can be connected without moving authoritative logic into n8n, replayed
events cannot duplicate messages, and credentials remain outside Git. Live Gmail
success still requires the client's OAuth consent and controlled acceptance; an
inactive/importable workflow is not represented as a live connection.
