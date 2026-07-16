# ADR 0006: Transactional booking confirmation and buffered reservations

**Status:** Accepted

## Decision

A booking is created only by one PostgreSQL command after an authenticated staff member explicitly attests that every required party signed the charter agreement and records what they reviewed. That transaction validates a sent offer, creates the authoritative booking, creates an active yacht reservation from one day before through one day after the charter, creates a pending Yachtfolio action, emits a durable event, and advances the enquiry to `booked`.

PostgreSQL exclusion constraints reject overlapping active yacht reservation periods, including simultaneous confirmation attempts. Availability screens are advisory; the transaction is authoritative.

Confirmed bookings may be amended only through a reasoned command that revalidates the reservation atomically. Cancellation deactivates the reservation. Yachtfolio work remains pending until a person records completion evidence and can be explicitly reopened.

## Consequences

- An enquiry status alone can never block yacht dates.
- Direct inserts, status edits, reservation edits, lifecycle-history writes, and deletes are unavailable to application users.
- Booking confirmation cannot yet create tasks, documents, payments, reminders, calendar entries, or notifications; those belong to Phases 7, 8, and 11.
- Yachtfolio remains a manual external-system adapter until a supported integration is evidenced.
