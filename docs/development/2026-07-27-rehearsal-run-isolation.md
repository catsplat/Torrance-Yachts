# Rehearsal-run isolation

Implemented the first run-scoped rehearsal boundary:

- administrator-only fictional run creation;
- protected mapping of fictional emails, threads, contact, enquiry and yacht;
- a new fictional yacht per five-route run;
- unique fictional sender identity per run;
- no operational-settings mutation;
- administrator reset for the currently supported email/enquiry fixture scope;
- fail-closed reset when a later workflow type is present.

Local evidence: `npm run check` passed (99 tests, 3 skipped),
`npm run db:test` passed (664 assertions), and `npm run build` passed.

The full booking/document/task reset handler remains the next extension of this
boundary; this initial reset intentionally refuses those later entity types.
