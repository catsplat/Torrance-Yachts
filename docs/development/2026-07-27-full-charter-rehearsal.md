# Full charter rehearsal

The local development environment now has an administrator-only one-click
fictional charter rehearsal. It uses a separate, clearly fictional yacht and
calls the normal protected commands for:

- incoming enquiry creation and classification;
- commercial offer creation, review approval and sent-state audit;
- contract-issued and awaiting-signatures state transitions;
- human-confirmed booking creation;
- the one-day availability buffer on both sides of the charter;
- the protected booking document checklist; and
- the 16 dependency-aware booking tasks spanning steps `0.0` through `7`.

The run is tagged at every supported entity boundary and can be reset without
touching operational records. Reset retains only compact audit evidence. The
control is unavailable outside local development and does not call Gmail,
Telegram, Drive, Calendar, Sheets, Yachtfolio, an AI provider, or a real
recipient.

Before running it, an administrator explicitly approves the intended default
task template in **Tasks → Task templates**. That is a production safeguard,
not a demo inconvenience: a draft workflow must never generate booking work.

Evidence after a clean local reset:

- `npm run db:test` — 20 suites / 683 assertions passed, including isolated
  booking generation, buffered reservation, checklist and reset coverage.

The next extension is an interactive, synthetic completion of contract,
document, payment and post-charter actions. It must retain the same run-scoped
reset and no-provider guarantees.
