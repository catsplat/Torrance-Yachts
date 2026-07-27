# ADR 0029: Full charter rehearsal uses live operational commands

## Status

Accepted — 27 July 2026.

## Decision

The local-only full charter rehearsal creates its own fictional yacht, commercial
profile, rate and approved offer template, then calls the same protected
commands used in normal operation to create an enquiry, draft and approve an
offer, record it as sent, progress it to signature review, confirm the booking,
reserve buffered dates and generate the booking checklist and dependency-aware
tasks.

The rehearsal is not permitted to bypass the global task-template approval
boundary. An administrator must first approve the intended default workflow in
the normal Task templates screen. This ensures the rehearsal proves the
configured workflow which would create real booking work, rather than silently
using a hidden fixture.

All generated entities are mapped to one `rehearsal_run`. An administrator may
reset that run atomically after review; reset removes its booking, reservations,
tasks, commercial fixture and related fictional records, but retains aggregate
audit evidence that the rehearsal occurred. The one-click command does not call
a provider or recipient. ADR 0030 records the separate local-only extension
through fictional document and contract-review boundaries.

## Consequences

- The most consequential operational transition is locally reproducible without
  weakening approval or provider boundaries.
- The rehearsal verifies the actual availability buffer, document requirements
  and task engine rather than duplicating their behaviour in UI-only demo code.
- Invoice, Yachtfolio, payment settlement and post-charter rehearsal actions
  remain explicit human exercises until their synthetic paths are expanded and
  tested.
