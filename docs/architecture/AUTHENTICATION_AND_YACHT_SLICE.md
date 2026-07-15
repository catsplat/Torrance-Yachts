# Authentication and yacht-management vertical slice

## Purpose

This is the first real end-to-end product slice. It proves that a known internal employee can sign in, reach a protected workspace, maintain operational yacht information, and produce a durable audit history without anonymous database access.

It deliberately does not model availability. The project brief requires yacht availability to come from booking records, including the eventual 24-hour operational buffer, rather than a manually editable yacht flag.

## Request path

```text
Browser
  -> Next.js proxy (refresh cookies and reject unauthenticated routes)
  -> protected server layout (verify claims and active profile)
  -> server component or server action
  -> server-side Supabase client
  -> PostgreSQL privileges and Row Level Security
  -> validation/audit triggers
  -> yachts, profiles, and audit_events
```

The proxy improves navigation behaviour but is not treated as the only defence. Protected layouts verify identity again. Yacht mutations validate untrusted form input and PostgreSQL makes the final permission decision.

## Components

### Identity

- Supabase Auth stores password identities; the application never handles password hashes.
- An auth trigger creates a least-privileged `staff` profile.
- Public registration is disabled.
- `current-user.ts` derives a verified user ID from Supabase claims and resolves the active RLS-protected profile.
- Inactive profiles cannot enter the workspace or access application tables.

### Yacht register

- Server-rendered list and detail pages read the authoritative database.
- A reusable client form supports create and edit operations while retaining server actions as the mutation boundary.
- Zod normalises optional inputs and enforces bounds before a query is attempted.
- PostgreSQL constraints repeat durable invariants, including positive dimensions and maximum speed not below cruise speed.
- The per-yacht notification phone accommodates the sketch requirement that a differently managed yacht can notify its own responsible contact later.

### Audit

- PostgreSQL triggers record yacht insert, update, and delete events.
- The actor comes from the authenticated database context rather than a form field.
- Audit rows are readable by active staff but cannot be inserted, edited, or deleted through the application role.
- The yacht detail page shows an event count as immediate proof that history exists; a full audit viewer is a later slice.

## Trust boundaries

| Boundary | Control |
| --- | --- |
| Public browser to application | no public registration; server-verified claims; generic login errors |
| Application to database | cookie-scoped Supabase client; no browser service key |
| Untrusted form to mutation | Zod server validation plus PostgreSQL constraints |
| User to protected rows | explicit grants plus RLS policies |
| Staff to privileged administration | database role and active-status checks |
| Mutation to audit history | database-owned trigger; application has read-only audit access |

## Failure behaviour

- Invalid credentials disclose no account-existence detail.
- Invalid form fields return field-level guidance without a query.
- Expired sessions return the user to sign-in or produce a reauthentication message.
- Duplicate yacht names return a specific non-destructive error.
- Yacht screens have loading UI and a retryable error boundary.
- Failed writes do not redirect and do not create a successful audit event.

## Future extension points

- `yachts.id` is ready to anchor contacts, documents, enquiries, offers, and bookings.
- Booking periods will become the sole availability source.
- Private yacht documents will use storage records and signed URLs, not public buckets.
- Notification routing can consume `notification_phone` without embedding channel calls in the yacht UI.
- Role helpers can be reused by administrator-only staff-management screens.
