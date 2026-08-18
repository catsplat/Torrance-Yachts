# ADR 0051: Manual Supabase Auth action links

## Decision

The private pilot may use administrator-generated, single-use Supabase Auth
invitation and recovery links instead of configuring an outgoing SMTP account.
The application calls Supabase's server-side `generateLink` API and displays
the resulting action URL once to the administrator for secure manual delivery.

## Rationale

This removes a paid or personal sender mailbox from the initial deployment while
retaining Supabase's expiry, token hashing and one-time-use semantics. Homemade
codes would create unnecessary credential storage and recovery risk.

## Boundaries

Links are never written to the database, logs, audit records or browser storage.
Only an administrator can generate them. The existing active-profile, approval,
MFA and RLS controls remain unchanged. SMTP remains available for a later
client-owned mailbox when manual delivery is no longer convenient.
