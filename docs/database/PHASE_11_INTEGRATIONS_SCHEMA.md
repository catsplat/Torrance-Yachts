# Phase 11 integrations schema

## Core tables

- `integration_connections`: enabled state and non-secret target metadata.
- `notifications`: recipient, channel, priority, approval, source, and delivery
  state.
- `integration_deliveries`: generic leased outbox for every provider operation.
- `calendar_events`: authoritative internal calendar and optional sync state.
- `integration_snapshots`: immutable one-way Sheets payloads and hashes.
- `invoice_profiles`: private, versioned, administrator-approved invoice details.
- `generated_invoices`: immutable link between deterministic commission,
  approved profile, and private document.

## Delivery commands

Trusted automation may run the materialisation tick, claim work, and report
success/failure. Staff may create/review notifications and request verified Drive
copies. Administrators configure providers, queue Sheets snapshots, manage invoice
profiles, and retry failures.

Direct table lifecycle mutation is blocked. RLS limits reads to active staff and
keeps snapshots/financial configuration under the appropriate role boundary.

## Idempotency

- notification keys prevent repeated reminders;
- email provider-action IDs prevent repeated Gmail changes;
- calendar ID plus revision prevents duplicate event versions;
- verified document ID plus version prevents duplicate Drive copies;
- snapshot payload hashes prevent duplicate workbook exports.
