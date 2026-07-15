# Phase 3 verification record

**Date:** 15 July 2026

**Scope:** contacts, companies, company relationships, yacht responsibilities, RLS, and audit behaviour

**Data:** synthetic only

## Automated evidence

| Gate | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript `--noEmit` | Passed |
| Application validation unit tests | 10 passed across 2 files |
| Next.js production build | Passed |
| Combined pgTAP database/RLS suite | 42 passed across 2 files |
| Phase 3 pgTAP additions | 28 assertions |
| Supabase schema lint at warning level | No findings |

The application and database gates are configured as independent GitHub Actions jobs. Pull-request CI provides the authoritative clean-run evidence for the committed candidate.

## Browser acceptance evidence

The Phase 3 slice was exercised in the running application against local Supabase:

1. The contact list loaded three deterministic synthetic seed people with multi-role badges.
2. A fourth synthetic contact was created with broker and operations roles.
3. The contact was linked to a synthetic company with job title and primary status.
4. The contact received a primary operations responsibility for a synthetic yacht and was made eligible for later notifications.
5. The same relationship appeared on the yacht detail page with role, primary, and notification indicators.
6. A new synthetic company was created and its phone number was updated.
7. Contact text search and role filtering produced one expected match and preserved URL query state.
8. The contact detail page was verified at a 390-by-844 viewport with no horizontal overflow and mobile navigation available.
9. Sign-out returned the user to login; a direct request for `/contacts` remained protected.
10. The synthetic administrator signed back in successfully.

## Security assertions covered by pgTAP

- All four Phase 3 tables exist and have Row Level Security enabled.
- Anonymous users cannot read directory records.
- Active staff can read, create, and update master records and manage relationship records.
- Staff cannot hard-delete contacts or companies.
- Administrators can hard-delete unreferenced contacts and companies.
- A contact can hold several validated roles.
- A contact can have only one primary company.
- A yacht can have only one primary contact for each responsibility.
- Successful inserts, updates, and relationship changes attribute their actor and produce audit events.
- Inactive internal profiles lose directory access.

## Residual risk and release boundary

- This is local evidence, not a production security approval.
- The tested records are synthetic; no private contact list has been migrated.
- Notification eligibility is metadata only and cannot send a message.
- Search loads at most 500 RLS-authorised rows before applying normalised matching in the server component.
- Production invitations, MFA decision, backup/restore, monitoring, retention, incident response, and independent access review remain release gates.
- Local Supabase services remain synthetic-only and should run on a trusted/private network with the host firewall enabled.
