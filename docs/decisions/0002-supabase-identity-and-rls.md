# ADR 0002: Supabase identity with PostgreSQL-enforced access

**Status:** Accepted

**Date:** 15 July 2026

## Context

The platform is private, initially used by one employee, and expected to support no more than four or five internal users. It will eventually contain commercially sensitive booking information and private documents. A shared password would make actions impossible to attribute and would complicate offboarding, audit, and future permissions.

The project also needs minimum custom infrastructure. Supabase is already the selected PostgreSQL, authentication, and future storage platform.

## Decision

Use individual Supabase email/password identities. Disable public registration and create internal users through an administrator-controlled process.

Create a `public.profiles` record for every authenticated identity. Profiles have an explicit `administrator` or `staff` role and an `active` switch. Enforce permissions in PostgreSQL with Row Level Security and database functions, not only in pages or server actions.

The application proxy performs early route redirection using verified authentication claims. Server layouts and mutations repeat the identity check. PostgreSQL remains the final authorisation boundary.

## Consequences

### Benefits

- Every change can be attributed to a person.
- Disabling one employee does not affect other users.
- A browser or application bug cannot bypass the database policy.
- The same access model can protect future enquiries, bookings, tasks, and documents.
- Supabase avoids a custom password-storage implementation.

### Costs and limitations

- The first administrator must be bootstrapped deliberately.
- Invitations, recovery, and optional MFA need production configuration.
- Local and hosted Supabase environments require separate credentials and callback URLs.
- A profile lookup is needed to determine application role and active status.

## Rejected alternatives

- **One shared password:** insufficient attribution, offboarding, and auditability.
- **UI-only permission checks:** not a security boundary and easy to bypass through APIs.
- **OAuth as the first method:** adds provider configuration without improving the initial one-user workflow.
- **A custom Python or Next.js authentication service:** more security-sensitive custom code with no project-specific benefit.

## Guardrails

- Never trust user-supplied metadata for roles.
- Never expose a Supabase service-role key to the browser.
- Never use `getSession()` alone to authorise server work; verify claims and rely on RLS.
- Public registration remains disabled unless a later ADR replaces this decision.
- Production access is not approved until recovery, invitation, URL, MFA, logging, and offboarding policies are tested.
