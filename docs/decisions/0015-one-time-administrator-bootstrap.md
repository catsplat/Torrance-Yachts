# ADR 0015: One-time administrator bootstrap

**Status:** Accepted

## Context

A fresh hosted deployment has no profile and therefore no administrator who can
invite staff. Creating the first account directly in Supabase Studio works but is
easy to misconfigure, weakens the repeatable deployment process, and is not a
good client handover.

Public registration is not acceptable for this private operational system. A
permanent “first user becomes administrator” rule is also unsafe because an
unexpected empty or damaged profile table could reopen privilege assignment.

## Decision

Expose `/setup` without an authenticated session only when both conditions hold:

1. `INITIAL_ADMIN_SETUP_TOKEN` is configured with at least 32 characters; and
2. the profile table contains no records.

The submitted token is compared in constant time. Auth metadata causes the profile
trigger to create the candidate inactive in the same transaction as the Auth
user. A narrowly granted database command then verifies that it is the only
profile and atomically promotes it plus records a workflow event. Any failure
deletes only the just-created Auth user. A concurrent second setup attempt cannot
retain an additional active account.

The trusted service role receives execute permission on the narrow bootstrap
commands, not raw access to profiles or workflow events.

After successful setup the operator removes the environment token and restarts
the application. Even if that removal is delayed, the presence of the first
profile keeps setup closed. All later users are invited by an administrator.

## Consequences

- Fresh installation no longer requires direct database editing.
- Public registration remains disabled.
- The setup token never enters the database, audit payload, source control, or
  browser-readable configuration.
- Setup completion is attributable and auditable.
- Deployment documentation must treat the token as temporary and require its
  removal before launch approval.
