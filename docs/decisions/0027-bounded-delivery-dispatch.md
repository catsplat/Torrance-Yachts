# ADR 0027: Bounded delivery dispatch and observable retry policy

## Status

Accepted — 27 July 2026.

## Decision

The automation adapter claims only a small capability-scoped batch of provider
deliveries at a time. The application dispatches at most three concurrently and
stops starting new work before its 25-second route deadline. Individual Gmail
and Telegram calls have shorter timeouts than that deadline.

Transient provider failures use a one-minute initial retry delay, exponential
back-off, and up to 29 seconds of jitter. A delivery becomes a visible permanent
failure after eight attempts or immediately for a non-retryable error. The
database remains authoritative for completing or failing every claim; a worker
does not assume that a provider outcome was recorded.

The operational queue exposes pending, claimed, failed, permanent-failure and
oldest-item metrics through a restricted database function.

## Consequences

- A slow or unavailable provider cannot monopolise an n8n invocation.
- Retry storms are reduced without hiding failures from staff.
- Delivery completion remains idempotent and auditable in PostgreSQL.
- Queue health is available to future operations dashboards and alerting without
  exposing the delivery register to anonymous users.
