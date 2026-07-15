# Phase 2 verification record

**Date:** 15 July 2026

**Scope:** local authentication, yacht management, RLS, and audit vertical slice

**Data:** synthetic only

## Automated evidence

| Gate | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript `--noEmit` | Passed |
| Yacht validation unit tests | 3 passed |
| Next.js production build | Passed |
| pgTAP database/RLS suite | 14 passed |
| Supabase schema lint at warning level | No findings |
| npm dependency audit at high threshold | 0 vulnerabilities |
| npm 11.16.0 locked-install dry run | Passed |
| Git whitespace/error check | Passed |

The same application and database gates are configured as independent GitHub Actions jobs for pull requests and pushes to `main`.

## Browser acceptance evidence

The slice was exercised in the running application against local Supabase:

1. An unauthenticated visit to `/` redirected to `/login`.
2. An unauthenticated visit to `/yachts` redirected to `/login`.
3. A synthetic local administrator signed in with email/password.
4. The workspace displayed that user's profile rather than a hard-coded name.
5. The yacht register loaded two synthetic seed rows.
6. A third synthetic yacht was created through the form.
7. Its home port and operational status were edited successfully.
8. Its audit-event count increased from one to two.
9. Sign-out returned the user to `/login` and protected routes remained inaccessible.
10. The user signed back in and the 390-by-844 responsive yacht list and navigation were exercised.
11. No browser console errors were observed during the acceptance path.

## Security assertions covered by pgTAP

- Phase 2 tables exist and have Row Level Security enabled.
- Anonymous access to yacht records is denied.
- Active staff can select, insert, and update yachts.
- Active staff cannot delete yachts.
- A successful mutation attributes and records its actor.
- Marking a staff profile inactive immediately removes yacht access.
- An active administrator can delete a yacht.

## Residual risk and release boundary

- This evidence covers the local implementation, not a production environment.
- Production authentication URLs, invitations, recovery, MFA decision, secrets, backup/restore, monitoring, and incident response remain unverified.
- Windows Docker Desktop published some local Supabase ports on `0.0.0.0` despite the official custom-network option. Local development therefore remains synthetic-only and restricted operationally to a trusted/private network with the host firewall enabled.
- The application must continue to use synthetic data until those controls and private storage policies pass a production gate.
- A full browser automation suite is not yet justified for this first slice; the critical data permissions are automated at the database layer.
