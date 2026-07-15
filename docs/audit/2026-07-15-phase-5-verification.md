# Phase 5 verification record

**Date:** 15 July 2026

**Scope:** yacht commercial profiles, effective rates, approved public sales-material links, versioned templates, deterministic draft snapshots, offer approval/sent recording, enquiry lifecycle integration, RLS, audit, and workflow events

**Data:** synthetic only

## Automated evidence

- `npm run check`: passed.
  - ESLint: passed.
  - TypeScript: passed.
  - Vitest: 6 files and 33 tests passed.
- `npm run build`: passed with Next.js 16.2.10; all offer and commercial routes compiled.
- `npm run db:test`: 4 pgTAP files and 134 assertions passed, including 55 Phase 5 assertions.
- `npm run db:lint`: passed with no findings at warning level.
- `npm audit --audit-level=high`: zero known vulnerabilities.
- Clean local migration and synthetic seed rebuild: passed before the final database test run.

## Browser acceptance evidence

The initial authenticated browser attempt exposed a stale-session loop after the local Auth database had been rebuilt. The middleware was corrected so `/login` remains reachable even when a browser holds claims for a removed development identity. Fresh HTTP checks now show unauthenticated `/` redirects once to `/login` and `/login` returns 200.

The browser had already moved into its protected internal redirect-error document and correctly blocked subsequent local navigation. The following clean-session checks therefore remain pending and must be completed before Phase 5 is tagged or merged:

- approve the synthetic yacht template;
- create, edit, approve, and record one synthetic offer as sent;
- verify offer, enquiry, workflow-event, and audit histories;
- verify dashboard and list counts;
- verify mobile navigation and horizontal overflow;
- verify logout/protected-route behaviour and browser console output.

## Release boundary

- No email is sent and no external service is connected.
- Offers do not reserve yacht availability.
- Only approved public sales-material links may be included; private document storage remains Phase 8.
- The application remains local, synthetic-only, and unapproved for live data or production deployment.
