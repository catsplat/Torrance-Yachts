# Pre-bake readiness milestone

**Candidate:** v0.19.0
**Date:** 9 August 2026

## Purpose

Close the remaining shared-application gaps before any hosting, live provider
credential, client record, or desktop packaging is introduced.

## Significant changes

- Replaced capped operational reads with cursor contracts, exact aggregates,
  indexed search and large-register proof.
- Enforced approved active identities and mandatory TOTP AAL2 across password,
  Google, route-handler and sensitive-command boundaries.
- Consolidated Gmail into the application-owned encrypted OAuth path and retired
  credential-dependent n8n workflows.
- Added leased, bounded AI work processing and expanded operations health.
- Completed private document quarantine/release recovery and administrator scan
  controls.
- Added saved daily-work views, redacted audit register and guided business setup.
- Expanded browser acceptance across administrator, staff, unapproved user,
  mobile review, workflow, keyboard and accessibility paths.
- Added a fail-fast release command including disposable backup/restore proof.

## Boundaries retained

PostgreSQL remains authoritative. AI is advisory. External email is created as a
draft only after approval. Calendar, Drive and Sheets are one-way mirrors.
Yachtfolio remains an evidenced human task. Fictional records and fake providers
are used until client acceptance.

## Acceptance

The release is tagged only after `npm run release:verify` succeeds from a clean
checkout. Client credentials, private values, infrastructure, retention-policy
approval, staff UAT and live provider acceptance remain separate launch work.
