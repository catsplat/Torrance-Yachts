# ADR 0024: Server-side cursor queries for operational registers

## Status

Accepted — 27 July 2026.

## Context

The initial Enquiries register loaded a fixed 500 recent rows and then searched
them in the Next.js server component. That made older authorised enquiries
silently disappear from a search result and did not scale with the operational
history the platform is intended to retain.

## Decision

Operational register filtering, search, ordering and totals are implemented in
PostgreSQL. The Enquiries register uses a stable descending
`(updated_at, id)` cursor with a maximum requested page size of 100. Its
Next.js data module is server-only; UI pagination preserves the filters and
cursor in the URL.

Text matching is a case-insensitive literal substring match over the requested
enquiry's reference, summary and permitted linked party/yacht/owner names.
The query and count functions are `security invoker`, granted only to
authenticated users, so RLS remains authoritative.

## Consequences

- No authorised enquiry can disappear merely because it falls outside a UI
  fetch cap.
- Result totals are accurate for the selected filters.
- Page metrics are explicitly labelled as page-local unless separately
  aggregated in PostgreSQL.
- Other historical registers will adopt the same contract incrementally rather
  than retaining arbitrary `.limit(...)` windows.
