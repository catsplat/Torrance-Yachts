# 0054 — Operational task conditions

## Decision

Tasks may belong to one enquiry or one booking. Staff create live tasks through
one operational form; dependencies and readiness conditions are evaluated in
PostgreSQL. Administrators retain control of reusable booking workflow template
publication.

## Why

The earlier interface separated ad-hoc work from the booking checklist and made
ordinary task creation harder than the operational work it represented.

## Consequences

- Existing tasks, dependencies, templates and history remain unchanged.
- New tasks can wait for selected prerequisite tasks, a released/verified
  document, a booking state, or a fixed date.
- Enquiries do not reserve yacht dates. Booking confirmation remains the only
  source of a buffered reservation.
- Cancelling a booking stops unfinished tasks but creates a single auditable
  `Confirm cancellation` acknowledgement task.
