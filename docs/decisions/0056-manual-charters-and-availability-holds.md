# 0056 — Direct charter entries and availability holds

**Date:** 2026-08-26  
**Status:** accepted

## Decision

Keep contractual bookings and simple availability holds distinct. A confirmed
charter entered without an enquiry is stored as a `manual` booking with no
synthetic enquiry or offer. It follows the ordinary reservation, task,
document, payment and Yachtfolio workflow.

An availability hold is a separate audited record. It participates in the
same one-day-before/one-day-after availability calculation and calendar, but
does not create commercial work. Changes and cancellations require a recorded
reason and retain the original record for the audit trail.

## Consequences

- Existing enquiry-led bookings retain their required source records.
- Availability cannot be bypassed by direct-entry work.
- Staff can model owner use, maintenance coordination and externally managed
  dates without inventing a charter fee or contract.
- A blank communication-template subject means that the template is intended
  for an existing conversation; it is not a missing required business field.
