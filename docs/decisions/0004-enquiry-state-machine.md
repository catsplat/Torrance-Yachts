# ADR 0004: Enquiry changes use a database-enforced state machine

**Status:** Accepted

**Date:** 15 July 2026

## Context

The charter workflow moves an enquiry through new, reply, offer, negotiation, contract, signature, booking, charter, and closure states. Free-text or directly editable status values would allow impossible jumps, lose the reason for a change, and make future automation unreliable. In particular, an enquiry must not become a booking merely because a user or integration changes a status field.

## Decision

Store enquiry state as a PostgreSQL enum and permit changes only through the `transition_enquiry_status` database command. The command checks an explicit transition graph, requires an active internal user and a written reason, and records both immutable status history and a durable workflow event in the same transaction.

Phase 4 can progress an enquiry as far as `awaiting_signatures`. The transition to `booked` is intentionally absent. Phase 6 will introduce a separate, human-confirmed booking command that validates reviewed contract data, creates the booking and availability reservation, then advances the originating enquiry atomically.

Enquiries have no delete policy. Users cancel or archive them so their notes, history, events, and audit evidence remain available. Notes are append-only in this slice.

## Consequences

### Benefits

- Invalid state jumps fail at the database boundary, not only in the interface.
- Every accepted transition has actor, time, previous state, new state, and reason.
- Workflow events are durable facts that later automation can process idempotently.
- A retry or malicious direct update cannot bypass booking safeguards.
- Historical enquiries remain traceable after cancellation or archiving.

### Costs and limits

- The transition graph currently exists in PostgreSQL and TypeScript; database and unit tests must keep them aligned.
- Correcting an append-only note requires a follow-up note rather than silent editing.
- Event processing attempts, retries, and consumer checkpoints arrive with the automation layer; Phase 4 records events but does not dispatch them.
- Booking, availability conflict detection, and signed-contract approval are deliberately deferred to Phase 6.

## Rejected alternatives

- **Editable status dropdown:** too easy to bypass business rules and does not preserve a reason.
- **Application-only checks:** an API, SQL client, or future integration could bypass them.
- **Create a booking by setting `status = booked`:** cannot atomically validate contracts, block dates, or generate downstream work.
- **Hard-delete closed enquiries:** destroys operational and audit history.

## Guardrails

- PostgreSQL remains authoritative; a future Sheet is only a controlled view or adapter.
- AI may propose fields or a transition but may not execute a consequential transition.
- Reference contacts, companies, yachts, and owners are validated as active and eligible when assigned.
- External email identifiers are not invented in the manual slice; Gmail ingestion owns them later.
