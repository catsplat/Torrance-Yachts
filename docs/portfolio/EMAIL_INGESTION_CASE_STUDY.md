# Portfolio case study: reliable email intake before AI

Phase 9 demonstrates an integration boundary designed for retries and untrusted
content. It includes constant-time bearer authentication, bounded payload
validation, immutable message records, provider/thread idempotency, deterministic
routing, a human review queue, correction history, and an outbox for later Gmail
actions.

It also shows how operational clutter can be reduced without destroying history:
configurable inactivity rules archive low-conversion enquiries through the same
audited state machine used by staff.
