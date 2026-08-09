# ADR 0034: Explicit internal access approval

## Status

Accepted on 9 August 2026.

## Context

Google proves control of an identity; it does not prove that the person is an
authorised Torrance Yachts staff member. Public sign-up is disabled, but that
configuration must not be the only boundary between an OAuth identity and
operational data.

## Decision

Each profile records a separate approval timestamp. PostgreSQL treats a user as
staff only when the profile is both active and approved. Administrator email
invitations and the one-time administrator bootstrap establish approval. A new
provider identity without an invitation is created inactive, signed out at the
application callback and denied by RLS even if an Auth session exists.

Deactivation preserves the approval timestamp for audit history. Reactivation
or approval is an administrator command and produces the existing profile audit
and workflow evidence.

## Consequences

- Google sign-in remains familiar for approved staff.
- Possessing an arbitrary Google account is insufficient for access.
- A provider or sign-up configuration mistake does not grant database access.
- Staff onboarding still begins in Settings → Accounts.
