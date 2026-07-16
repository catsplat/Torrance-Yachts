# ADR 0007: Versioned dependency-aware task engine

**Status:** Accepted
**Date:** 16 July 2026

## Decision

Booking work is generated from one approved default template version inside the same PostgreSQL transaction that confirms a booking. Template steps, dependency edges, date anchors, offsets, reminders, escalation settings, optionality, priority, and external-action requirements are data rather than application conditionals.

Generated tasks are immutable in provenance. Staff may complete, reopen, reschedule, assign, annotate, or add/cancel ad-hoc tasks only through controlled commands. Approved templates are immutable; administrators clone them before changing steps or dependencies.

## Reasons

- Retrying booking confirmation must not duplicate tasks.
- Reopening prerequisite work must re-evaluate downstream readiness.
- Payment tasks need to exist before Phase 8 while remaining blocked until reviewed contract dates are supplied.
- Yachtfolio completion remains a separately evidenced human action.
- Historical bookings must retain the exact workflow version originally applied.

## Consequences

- PostgreSQL owns lifecycle transitions, dependency evaluation, audit records, and workflow events.
- A booking cannot be confirmed until an approved default task template exists.
- Charter-date amendments reschedule open booking-anchored tasks.
- Cancelling a booking cancels its remaining open tasks without deleting history.
- Notification delivery is still deferred; reminder and escalation configuration is stored for Phase 11.
