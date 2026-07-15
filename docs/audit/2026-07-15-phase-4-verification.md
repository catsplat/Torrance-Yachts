# Phase 4 verification record

**Date:** 15 July 2026

**Scope:** manual enquiries, reference validation, lifecycle controls, append-only records, workflow events, audit behaviour, and live dashboard enquiry counts

**Data:** synthetic only

## Automated evidence

| Gate | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript `--noEmit` | Passed |
| Application unit tests | 20 passed across 3 files |
| Combined pgTAP database/RLS suite | 79 passed across 3 files |
| Phase 4 pgTAP additions | 37 assertions |
| Supabase schema lint at warning level | No findings |
| Next.js production build | Passed with Next.js 16.2.10 |

Pull-request CI is the authoritative clean-run evidence for the released candidate.

## Database security and behaviour evidence

- Enquiry, note, history, and workflow-event tables have Row Level Security.
- Anonymous and inactive identities cannot read or mutate enquiry data.
- New references must point to contacts, companies, yachts, and owners that are active and operationally eligible.
- A new enquiry starts in `new` and must identify at least one requester.
- Direct status updates fail; the transition command requires an active staff identity, an allowed edge, and a written reason.
- The Phase 4 graph provides no transition to `booked`.
- Every creation and state change records lifecycle history and a workflow event in the same transaction.
- Notes are append-only; history and events are application read-only; enquiries have no delete policy.
- Actor attribution and general audit events are database-owned.

## Browser acceptance evidence

The authenticated local application passed the following acceptance path:

- Listed the two deterministic seed enquiries and opened their detail records.
- Created synthetic enquiry `ENQ-2026-0017` with linked requester, broker, broker company, yacht, owner, charter dates, guest count, route, priority, and indicative budget.
- Edited the summary and budget and received the expected saved confirmation.
- Moved the enquiry from `New` to `Waiting for reply` with a mandatory written reason. The updated status, three audited record changes, two durable workflow events, and lifecycle-history entry were visible after refresh.
- Confirmed the available transition targets were `New`, `Offer sent`, `Cancelled`, and `Archived`; `Booked` was not exposed.
- Added an append-only requirement note and confirmed it appeared once in the record timeline.
- Filtered the register by reference, urgent priority, and `M/Y Solstice`; only `ENQ-2026-0017` remained.
- Confirmed the dashboard reported three live open enquiries and the correct `New`, `Waiting for reply`, and `Offer sent` distribution.
- Tested the enquiry detail at a 390 x 844 mobile viewport: the mobile navigation was available and the document had no horizontal overflow.
- Signed out, confirmed a protected enquiry route redirected to `/login`, then signed back in with the synthetic local administrator account.
- Observed no browser console warnings or errors during the final acceptance run.

## Residual risk and release boundary

- This is a manual enquiry register, not yet an email-processing or AI system.
- Enquiry dates do not reserve a yacht. Availability begins with Phase 6 booking records.
- `Booked` and downstream charter states are present in the full enum but are inaccessible in this slice.
- Workflow events are durable facts only; consumers, retries, and integration delivery arrive later.
- Search is bounded to 500 authorised rows and must move to database-backed search before that limit is insufficient.
- The system remains local, synthetic-only, and unapproved for live data or production deployment.
