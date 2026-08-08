# ADR 0031: Post-contract rehearsal uses a run-owned draft invoice profile

## Status

Accepted - 8 August 2026.

## Decision

The administrator-only local full-charter rehearsal may complete the remaining
post-contract workflow using the same database commands and private document
boundaries as the operational application. This includes a deterministic,
clearly fictional Kylian commission-invoice PDF, recorded Yachtfolio evidence,
captain/broker hand-off evidence, fictional payment settlement, charter
start/end, and broker follow-up evidence.

The rehearsal invoice is registered through a narrowly scoped database command
using a draft `invoice_profiles` record bound to the active `rehearsal_run`.
It cannot select, approve, retire, or become the default for an operational
invoice profile. The ordinary generated-invoice command continues to require
an approved operational profile.

The shared deterministic document-generator boundary accepts a server-only
service-role request plus the authenticated active staff profile that requested
the artefact. This preserves the correct human actor in document and history
audit fields; it does not rely on a service token having a user identity.

Every resulting booking, invoice profile, generated invoice, document, task,
payment and manual-action record is mapped to the same run. Reset removes only
those fictional operational records, while retaining non-sensitive audit
evidence that the rehearsal occurred.

## Consequences

- The entire client task sequence `0.A` through `7` is demonstrable locally
  without a real recipient, supplier, document, payment or commercial term.
- The rehearsal does not send a Telegram message, create/send Gmail content,
  call Yachtfolio, move a real calendar, or contact a captain or broker.
- The special invoice command is restricted to administrators and an active,
  mapped fictional run; it is not a production shortcut around invoice-profile
  approval.
- Provider activation and human operational acceptance remain separate launch
  gates.
