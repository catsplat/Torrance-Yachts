# Torrance Yachts Charter Operations Platform

A private internal platform for managing Torrance Yachts' charter workflow, from the first enquiry email through booking operations and post-charter follow-up.

> **Development status:** foundation preview only. Authentication, the database, file storage, and external integrations are not connected. Do not deploy or enter real client data yet.

## Current milestone

Version `0.1.0` establishes:

- the approved project brief and interpreted planning-sketch requirements;
- a current Next.js App Router application with TypeScript and Tailwind CSS;
- a reusable shadcn/ui design foundation;
- responsive desktop and mobile workspace navigation;
- an operational dashboard populated only with labelled synthetic data;
- placeholder routes for every planned primary module;
- linting, strict TypeScript checking, production builds, and dependency auditing;
- audit, architecture, decision, security, development, and portfolio records.

## Technology foundation

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui using Base UI primitives
- ESLint
- npm

Supabase, n8n, Gmail, Telegram, Google Drive, Google Calendar, Google Sheets, and AI providers remain planned integrations. No accounts or paid services have been created by this milestone.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Before committing changes, run:

```powershell
npm run check
npm run build
npm audit
```

## Documentation

- [Authoritative project brief](docs/PROJECT_BRIEF.md)
- [Original sketch interpretation](docs/planning/ORIGINAL_SKETCH_NOTES.md)
- [Foundation architecture](docs/architecture/FOUNDATION.md)
- [Architecture decisions](docs/decisions/0001-application-foundation.md)
- [Development diary](docs/development/2026-07-15-foundation-slice.md)
- [Foundation verification record](docs/audit/2026-07-15-foundation-verification.md)
- [Portfolio case study](docs/portfolio/FOUNDATION_CASE_STUDY.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Data safety

This repository must contain no live client data, passports, KYC/CDD files, signed contracts, bank details, private contact lists, API credentials, or current confidential commercial terms. Development and portfolio material must use synthetic or explicitly sanitised data.
