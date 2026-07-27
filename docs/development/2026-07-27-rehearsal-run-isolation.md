# Rehearsal-run isolation

Implemented the first run-scoped rehearsal boundary:

- administrator-only fictional run creation;
- protected mapping of fictional emails, threads, contact, enquiry and yacht;
- a new fictional yacht per five-route run;
- unique fictional sender identity per run;
- no operational-settings mutation;
- administrator reset for the currently supported email/enquiry fixture scope;
- fail-closed reset when a later workflow type is present.

Initial local evidence: `npm run check` passed (99 tests, 3 skipped),
`npm run db:test` passed (664 assertions), and `npm run build` passed.

The later booking/task reset extension is now implemented and documented in
`2026-07-27-full-charter-rehearsal.md`; this initial note remains as the
historical record of its deliberately narrow first scope.
