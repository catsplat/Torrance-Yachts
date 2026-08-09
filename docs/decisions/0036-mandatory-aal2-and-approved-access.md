# ADR 0036: Mandatory AAL2 and approved internal access

**Status:** Accepted
**Date:** 9 August 2026

## Decision

Operational access requires a verified Supabase session, an active profile,
recorded internal approval and TOTP authenticator assurance level AAL2. Google
sign-in supplies only the first factor. New OAuth identities remain isolated on
the access-pending screen until an administrator approves them.

The same access check is used by data access, server actions and route handlers.
Administrator pages check role before loading their data. Factor reset requires
a different administrator, a reason and durable audit evidence.

## Consequences

- A shared password is not an acceptable production mode.
- Losing an authenticator requires the administrator-controlled recovery
  runbook; a user cannot silently bypass MFA.
- Local browser acceptance needs separate synthetic administrator and staff
  identities with separate factors.
- Access remains layered with PostgreSQL RLS rather than depending on navigation
  visibility.
