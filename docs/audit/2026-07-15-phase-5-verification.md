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

The initial authenticated browser attempt exposed a stale-session loop after the local Auth database had been rebuilt. The middleware was corrected so `/login` remains reachable even when a browser holds claims for a removed development identity. Fresh HTTP checks show unauthenticated `/` redirects once to `/login` and `/login` returns 200.

A fresh authenticated acceptance run then passed the complete synthetic workflow:

- approved the synthetic M/Y Asteria offer template;
- verified the seven-day, 168,000 EUR deterministic suggestion and approved public material links;
- created and edited offer `OFF-2026-0007`;
- recorded a human approval and separately recorded an external send while confirming the application sent no email;
- verified immutable offer history, three durable offer events, enquiry transition/history, and the linked offer version;
- verified live dashboard and offer-register counts;
- verified the 390 by 844 mobile layout, navigation drawer, and no horizontal overflow;
- verified sign-out, protected-route redirection, and an empty warning/error console.

The browser run also found a misleading persisted “Draft changes saved” query notice after approval/sent transitions. The notice is now limited to draft records and the sent-record URL was rechecked successfully. A one-off Turbopack stale-module overlay after development recompilation cleared on reload and did not recur.

## Release boundary

- No email is sent and no external service is connected.
- Offers do not reserve yacht availability.
- Only approved public sales-material links may be included; private document storage remains Phase 8.
- The application remains local, synthetic-only, and unapproved for live data or production deployment.
