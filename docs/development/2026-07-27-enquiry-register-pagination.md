# Enquiry register pagination hardening

## Completed

- Replaced the fixed 500-row Enquiries query and in-memory search with
  server-only PostgreSQL query and count contracts.
- Added indexed literal search over the operational enquiry register.
- Added URL-preserving, stable cursor pagination with an explicit first-page
  return action.
- Added database proof for complete matching counts, cursor continuation,
  malformed cursor rejection and anonymous access denial.

## Verification evidence

Executed locally on 27 July 2026:

```text
npm run check       # 102 application tests passed (3 intentionally skipped)
npm run db:test     # 644 database assertions passed
npm run db:lint     # no warnings
npm run build       # production build passed
```

## Follow-up

Bookings, tasks, documents and inbox registers still need equivalent
server-side query contracts. This milestone only removes the completed
Enquiries fixed-window defect.
