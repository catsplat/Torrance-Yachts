# ADR 0037: Application-owned Google adapters

## Status

Accepted. Supersedes the compatibility path retained by ADR 0032.

## Context

The application already stores each approved employee's Google OAuth connection
behind Supabase Vault. Keeping additional Gmail credentials and Gmail Trigger
workflows inside n8n duplicated consent, created two recovery paths, and made the
operator setup unnecessarily difficult.

## Decision

- The application-owned Google connection is the only Gmail credential path.
- A selected approved staff account supplies the operational inbox connection.
- Gmail history reconciliation is the sole production intake mechanism.
- The application performs Gmail fetch, mark-read, archive, and draft creation
  through bounded, idempotent adapters.
- Calendar, Drive, and Sheets use application-owned adapters and remain one-way
  mirrors of PostgreSQL records.
- n8n retains only scheduling, the development simulator, and readiness
  monitoring. It holds no provider credentials and no business rules.
- Gmail drafts require authenticated human approval and are never sent by the
  application.

## Consequences

There is one familiar Google consent path for staff, one reconnect state, and
one observable retry path. Provider outages cannot change authoritative records.
The retired n8n Gmail workflows and raw compatibility endpoints are removed, so
their credentials and setup instructions cannot accidentally be reintroduced.
