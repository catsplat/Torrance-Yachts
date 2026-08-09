# Operational register pagination

## Outcome

Offers, Bookings and Tasks now query PostgreSQL through stable, authorised
cursor-based register functions. Search, status, yacht, owner, priority and due
filters are applied by the database rather than to a recent in-memory window.

## Why this matters

The earlier pages were acceptable for synthetic development data but could stop
showing valid historical records after the fixed query limit was reached. That
is unsafe for an operational system where an older booking, task or offer may
still need to be found and audited.

## Implementation

- Added indexed register functions with deterministic sort keys and complete
  cursor validation.
- Added exact count functions under the authenticated user's existing RLS
  context.
- Kept filters and pagination state in the URL.
- Added server-only data modules so database query rules do not leak into page
  components.
- Added pgTAP coverage for counts, cursor continuity, malformed cursors,
  due-state validation and anonymous denial.

## Verification

The functions were tested through both PostgreSQL and the authenticated local
PostgREST boundary. The application quality gates and production browser smoke
test are recorded with the release commit.
