# Pre-bake operational contracts

## Registers

Operational list functions accept a bounded `limit`, stable cursor, query text,
module-specific filters and deterministic sort order. Responses include rows,
the next cursor and an exact matching count. Browser URLs retain query, filter,
sort and cursor state. Supporting partial/composite indexes cover status, dates,
owners, yachts and cursor keys.

The dashboard and workspace search use aggregate/RPC contracts rather than
counting capped browser arrays. Large-register pgTAP fixtures prove a matching
record remains discoverable beyond 10,000 rows.

## Access

Operational commands require a verified Supabase claim, active approved profile,
permitted role and AAL2. Administrator commands and sensitive document actions
recheck that context immediately before mutation. Access-pending identities have
no operational RLS visibility.

## AI work

`claim_ai_work` leases a bounded batch to one worker. Completion/failure verifies
lease ownership; expired leases can be reclaimed. Retry count, next attempt,
permanent failure, queue depth and oldest-pending age are database-visible.

## Documents

Document metadata records quarantine path, released path, SHA-256, validation
state, scanner state, scan attempts, error summary, retention review and safe
recovery information. Signed access and workflow verification require the
released state. Duplicate detection is scoped to the booking requirement.

## Operations

The operations-health contract aggregates Gmail lag/reconciliation, AI queue,
outbox age, scanner health/backlog, OAuth failures and backup age without
returning private payloads or credentials. Audit register contracts provide
redacted before/after details, reasons and actor/entity/action/source/date filters.

The business-readiness contract returns counts and completion flags only for
company, yachts/captains, rates/templates, invoices, timeouts, staff/alerts,
Google connections/destinations, booking workflow and document-policy acceptance.
