# Email inbox pagination hardening

The inbox now filters, searches, counts, orders and paginates in PostgreSQL.
The UI preserves the active search and classification in the URL and never
loads a fixed 1,000-message register.

Local database evidence covers three matching messages, correct totals, cursor
continuation, malformed-cursor rejection and anonymous execution denial.

Verification: `npm run check`, `npm run db:test` (651 assertions),
`npm run db:lint`, and `npm run build` all passed locally.
