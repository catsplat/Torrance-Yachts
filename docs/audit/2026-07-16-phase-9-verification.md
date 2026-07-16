# Phase 9 verification record

**Status:** Passed for release `v0.9.0`

## Automated evidence

- Ten application test files / 49 unit tests passed.
- Eight PostgreSQL suites / 349 security and behaviour assertions passed.
- Production Next.js build passed with email, Settings, and integration routes.
- Database lint reported no warnings.

## Integration and workflow evidence

- An unauthorised ingestion request returned HTTP 401.
- An authorised synthetic Gmail message returned HTTP 202.
- Replaying the same provider event returned the same message ID.
- Authenticated rendering returned HTTP 200 for the inbox, message review,
  Settings, and dashboard.
- Unauthenticated email access redirected to `/login`.
- Database tests cover duplicate events, duplicate Gmail messages, circular
  routing, internal domains, attachments, new enquiries, automatic and manual
  follow-ups, correction history, provider actions, and inactivity sweeps.

All messages, addresses, domains, and content used in verification are synthetic.
