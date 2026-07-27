# ADR 0030: Post-booking rehearsal reuses the private document lifecycle

## Status

Accepted — 27 July 2026.

## Decision

The administrator-only local charter rehearsal may extend an existing fictional
booking through the compliance and contract-review boundaries. It creates only
synthetic KYC, passport, CDD and signed-agreement artefacts, uploads them to
the same private quarantine bucket used by the document pipeline, records a
clean local scanner result, moves them to private accepted storage, and records
human verification.

It then completes the relevant dependency-aware tasks, saves and approves
fictional contract facts, creates two fictional scheduled instalments, and
calculates a fictional commission. Every created record is attached to the
same `rehearsal_run` as the booking. Reset removes mapped synthetic storage
objects before calling the database reset command; if the storage boundary
fails, the database run remains available for a safe retry. Audit evidence that
the rehearsal occurred remains.

The extension does not contact an external scanner, Google Drive, Gmail,
Telegram, Calendar, Sheets, Yachtfolio, an AI provider or any recipient. It
does not send a message, mark a payment paid, create an invoice, or progress
the charter to completion. Those remain deliberate human actions or later
run-scoped rehearsal work.

## Consequences

- The private document and contract-review controls can be demonstrated locally
  without uploading real identity data.
- Rehearsal reset follows the production foreign-key order: document
  requirements are detached before their verified documents are removed.
- The synthetic PDF fixture exercises storage and scanner state transitions;
  it does not replace the production upload validation or malware-scanning
  policy.
- The remaining high-value extension is the controlled post-contract sequence:
  invoice evidence, Yachtfolio confirmation, payment settlement, charter
  start/end, and broker follow-up.
