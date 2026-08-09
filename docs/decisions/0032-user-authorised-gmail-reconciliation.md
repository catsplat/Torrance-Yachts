# ADR 0032: User-authorised Gmail reconciliation

## Status

Accepted.

## Context

The application already let each staff member connect Google Workspace for
personal alerts and approved Gmail drafts. Incoming email still depended on a
second Gmail credential configured inside n8n, which duplicated consent and made
setup harder than the familiar Google connection promised by the interface.

Gmail notifications are not a reliable source of full message content and can be
delayed or missed. A durable history cursor is required even when n8n or the host
is temporarily unavailable.

## Decision

- An administrator selects one active staff Google connection as the operational
  enquiry inbox.
- The automation tick refreshes that connection's Vault-held token, reads Gmail
  history in bounded batches, fetches full messages and calls the same durable,
  idempotent ingestion command used by the existing adapter.
- The first run records the current history cursor without importing old mail.
- An expired cursor performs one bounded seven-day recovery query before moving
  to the current cursor.
- PostgreSQL stores the selected mailbox, success/failure evidence and cursor.
- n8n remains the scheduler. It receives no Gmail password, refresh token or
  business authority.
- The raw n8n Gmail payload endpoint remains as a tested compatibility boundary,
  but it is no longer required for the preferred deployment.

## Consequences

Staff sign in and connect Google through normal consent screens once. The
administrator then chooses the inbox by name. Duplicate history events remain
safe because the existing Gmail message and provider-event keys are unique.
No email classification, enquiry creation, draft sending or booking action is
made authoritative by Gmail or n8n.

