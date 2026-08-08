# Complete fictional charter lifecycle rehearsal

The local full-charter rehearsal now extends from its approved fictional
contract through the post-contract tasks in the Torrance workflow:

- generates and records a clearly fictional 2% Kylian commission-invoice PDF;
- completes invoice recording and manual Yachtfolio evidence;
- records fictional captain/broker hand-off evidence without contacting either;
- settles the configured fictional instalments through the normal payment
  command;
- progresses the booking through charter active and completed; and
- records a fictional broker follow-up and commission-invoice evidence.

The implementation deliberately reuses the application boundaries instead of
creating a separate demo-only data model. It uses a rehearsal-run-owned draft
invoice profile so the production invoice workflow retains its approved-profile
requirement. All evidence remains private and all generated records can be
removed by the run-scoped administrator reset.

No external provider is invoked. The interface labels this action as a local
rehearsal and explains the human approval and delivery boundaries before it can
be run.

## Acceptance evidence

On 8 August 2026 the following local checks passed after a clean migration and
the documented Windows Storage restart recovery:

- `npm run db:types`
- `npm run db:test` - 691 database assertions
- `npm run check` - 99 passing unit tests, 3 explicitly skipped
- `npm run db:lint`
- `npm run build`

The local browser sign-in page also returned successfully after the reset, and
the development administrator was restored as an active administrator. A full
click-through of the new local lifecycle control remains part of the next
interactive acceptance pass; its underlying workflow and atomic reset are
covered by the database suite.
