# Booking and availability slice

## Command flow

```text
Awaiting-signatures enquiry + sent offer + reviewed signed agreement
  -> confirm_booking transaction
  -> authoritative booking
  -> active buffered reservation (-1 day / +1 day)
  -> pending Yachtfolio action
  -> BookingConfirmed workflow event
  -> enquiry becomes Booked
```

The database owns the invariant. The web application supplies validated reviewed facts and displays outcomes; it cannot independently insert bookings or reservations.

## Lifecycle

`confirmed -> charter_active -> completed` is the normal path. `confirmed` or `charter_active` may become `cancelled`, which releases the active reservation. Each move requires a reason, synchronises the linked enquiry, appends history, creates audit evidence, and emits a durable event.

## Availability

Every charter from `start` through `end` reserves the inclusive range `start - 1 day` through `end + 1 day`. A GiST exclusion constraint on yacht plus date range prevents active overlaps under concurrency. The checker uses the same calculation but remains advisory until confirmation commits.

## Boundaries

- PostgreSQL is authoritative; Calendar, Sheets, n8n, and Yachtfolio are not.
- No task sequence is generated until Phase 7.
- No contract file, KYC, payment schedule, or invoice is handled until Phase 8.
- No notification or calendar entry is sent in Phase 6.
