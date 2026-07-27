# Post-booking rehearsal extension

The full fictional charter rehearsal now continues beyond booking creation.
After an administrator creates the synthetic run, the local extension uses the
normal protected workflow boundaries to:

- complete steps `0.A` and `0.B`;
- create synthetic broker KYC, passport and CDD records;
- place each fictional document in private quarantine, record a clean scanner
  outcome, release it to accepted private storage and record review;
- add and verify a fictional fully signed charter agreement;
- complete step `1.A`;
- save and approve reviewed fictional contract facts;
- create two fictional scheduled instalments and calculate a fictional 2%
  commission; and
- complete step `1.B`.

The scenario is intentionally not a shortcut around the application. It keeps
task-template approval, document state transitions, contract approval, payment
scheduling, audit history and run-scoped reset intact. It uses no real identity
document, provider account, recipient, commercial data or external network
call.

## Browser acceptance evidence

On 27 July 2026 a local administrator completed this sequence in the web
interface, opened the fictional document workspace, then reset the run. After
a full page reload there was no active fictional rehearsal. The administrator
sign-in remained available after the database test reset.

## Quality evidence

- `npm run db:reset` (followed by the documented Windows Storage recovery)
- `npm run db:test`
- `npm run check`
- `npm run db:lint`
- `npm run build`

all completed successfully for this milestone. The database test suite includes
document mapping and reset assertions for the full fictional charter run.

## Remaining boundary

This is not a claim that the entire charter lifecycle is now automated. The
next operational extension should make the remaining client workflow
rehearsable through controlled commands: commission invoice generation and
recording, Yachtfolio confirmation evidence, payment settlement, charter
start/end and broker follow-up. External delivery remains disabled until a
separate client-owned activation stage.
