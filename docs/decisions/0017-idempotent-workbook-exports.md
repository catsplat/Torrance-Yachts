# ADR 0017: Idempotent workbook snapshot exports

**Status:** Accepted

## Context

Google Sheets is an optional one-way reporting adapter, never the operational
source of truth. A staff member may safely request the same workbook export more
than once while verifying an integration or retrying a delivery.

The original snapshot hash included the request timestamp. That made unchanged
operational content appear different on every request, creating unnecessary
snapshot rows and duplicate outbox work.

## Decision

- Hash only the stable operational content: enquiries, bookings, and authorised
  captain directory entries.
- Keep `generated_at` only in the payload as request metadata; it must not affect
  content identity.
- Reuse the existing unique `(snapshot_type, payload_sha256)` constraint and
  integration-delivery idempotency key.
- Test integration assertions against their own synthetic records rather than
  assuming that a local development database has no delivery history.

## Consequences

- An unchanged workbook request refreshes its request metadata without creating
  another snapshot or Google Sheets delivery.
- A changed operational record produces a new immutable snapshot and one new
  delivery, preserving an auditable reporting history.
- The test suite remains meaningful when a developer has existing synthetic
  integration records in their local database.
