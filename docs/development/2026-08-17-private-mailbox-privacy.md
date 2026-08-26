# Private mailbox privacy

Implemented 2026-08-17.

The email privacy slice adds ownership to Gmail threads, messages, and
ingestion events; scopes idempotency to the mailbox owner; and passes the
selected connected-account user through reconciliation and rehearsal
ingestion. `/emails` continues to use the existing server-side data access,
but RLS now limits private rows to the signed-in owner. A linked enquiry marks
the thread as shared so the existing operational records remain collaborative.

The same boundary covers email attachments, classification history, provider
actions, AI-derived email content, notification recipients, and AI work queue
ownership. OAuth token storage and per-user token isolation are unchanged.

## Verification

- `npm run db:reset`
- `npm run db:test` — 37 files, 967 tests passed
- `npm run db:lint`
- `npm run lint`
- `npm run typecheck`
- `npm test` — 147 tests passed, 3 skipped

## Deployment note

Apply migrations `20260817100000_isolate_private_mailboxes.sql` and
`20260817101000_scope_email_ai_requests.sql` in order. Before production
deployment, verify that the enabled Gmail ingestion setting points at the
intended mailbox owner; the first migration intentionally fails if legacy
email ownership cannot be recovered from that setting.
