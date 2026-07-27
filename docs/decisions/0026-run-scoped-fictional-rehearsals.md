# ADR 0026: Run-scoped fictional rehearsals

## Status

Accepted — 27 July 2026.

## Decision

Every development rehearsal starts with an administrator-created run. Each
fictional email, thread, contact, enquiry and yacht is recorded against that
run in a protected mapping table. The suite creates a new fictional yacht
instead of reusing seeded operational records, and it reads—never changes—the
configured internal email domain.

Supported early-run records can be reset atomically by an administrator. Reset
deletes only the tagged fictional records and their AI/email children while
retaining a reset audit record and aggregate record counts. If a run contains
later booking-workflow types that are not yet covered by the full reset
handler, reset fails before making changes.

## Consequences

- Fictional data has a durable, queryable ownership boundary.
- Operational settings and seed data are not test fixtures.
- The reset mechanism is conservative by design; it expands only alongside
  tested workflow coverage.
