# Access and release correction

## Outcome

The Google sign-in boundary now requires explicit internal approval throughout
the application and database. The Linux dependency lock and deployment
preflight were also repaired so GitHub can verify the actual release candidate.

## Implementation

- Added approval evidence to profiles and backfilled existing internal users.
- Changed new Auth profiles to approve only administrator invitations, trusted
  database fixtures, or the completed one-time bootstrap.
- Required active approval in the OAuth callback, authenticated request context,
  `is_active_staff()` and `is_administrator()`.
- Made the invitation action fail closed if the resulting profile is not active
  and approved, using the transactional command result without broadening the
  trusted Auth client's direct table privileges.
- Added database and unit coverage for approved and unsolicited OAuth paths.
- Regenerated the lockfile with the repository-pinned npm version and added the
  missing synthetic Cloudflare token to the deployment CI preflight.
- Corrected README release and verification totals.

## Verification

- 125 application tests passed.
- 798 database permission and behaviour checks passed.
- Lint, strict TypeScript, production build, database lint and production
  dependency audit passed.
- A clean Linux `npm ci` and the complete production Docker image build passed.
- Automation validation and production Compose preflight passed.
