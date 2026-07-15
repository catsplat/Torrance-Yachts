# Torrance Yachts Charter Operations Platform

A private internal platform for managing Torrance Yachts' charter workflow, from the first enquiry email through booking operations and post-charter follow-up.

> **Development status:** Version `0.2.0` provides authentication and the first secured database-backed yacht-management slice locally. Production services, file storage, and external integrations are not connected. Do not deploy or enter real client data yet.

## Current milestone

Version `0.2.0` adds the secured Phase 2 vertical slice to the application foundation:

- local Supabase/PostgreSQL development infrastructure;
- individual email/password identities with public registration disabled;
- protected workspace routes and verified server-side sessions;
- `administrator` and `staff` profiles with active-user controls;
- a database-backed yacht register with create, list, view, and edit operations;
- yacht-specific operational notification phone numbers;
- PostgreSQL Row Level Security and append-only yacht audit events;
- Zod validation, a recoverable error boundary, and synthetic seed records;
- unit tests, 14 database permission tests, database linting, and matching CI gates.

## Technology foundation

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui using Base UI primitives
- Supabase Auth, PostgreSQL, and the Supabase local development stack
- Zod and Vitest
- ESLint
- npm

n8n, Gmail, Telegram, Google Drive, Google Calendar, Google Sheets, file storage, and AI providers remain planned integrations. No production Supabase project or paid service is required by this milestone.

## Run locally

Requirements: Node.js 24 (see `.nvmrc`), npm, Docker Desktop, and Git.

```powershell
npm ci
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 torrance-yachts-local
npm run db:start
npm run db:status
Copy-Item .env.example .env.local
npm run dev
```

The Docker network command is a one-time setup recommended by Supabase. On Windows, verify the resulting port bindings and use a trusted/private network because Docker Desktop may still publish development ports on all host interfaces. Use synthetic data only. Fill the two blank values in the ignored `.env.local` using the API URL and publishable key printed by `npm run db:status`; never use the service-role key in the web application. Open `http://127.0.0.1:54323` to create a local internal user, then `http://localhost:3000` to sign in. The complete bootstrap and network-verification procedure is in [local development setup](docs/development/LOCAL_SETUP.md).

Before committing changes, run:

```powershell
npm run check
npm run build
npm run db:test
npm run db:lint
npm audit --audit-level=high
```

Use a short-lived branch and pull request for every product change. The current private GitHub Free repository cannot technically enforce branch protection, so this workflow is a documented owner responsibility until GitHub Pro is approved.

## Documentation

- [Authoritative project brief](docs/PROJECT_BRIEF.md)
- [Original sketch interpretation](docs/planning/ORIGINAL_SKETCH_NOTES.md)
- [Foundation architecture](docs/architecture/FOUNDATION.md)
- [Authentication and yacht-slice architecture](docs/architecture/AUTHENTICATION_AND_YACHT_SLICE.md)
- [Phase 2 database schema](docs/database/PHASE_2_SCHEMA.md)
- [Architecture decisions](docs/decisions/0001-application-foundation.md)
- [Supabase identity and RLS decision](docs/decisions/0002-supabase-identity-and-rls.md)
- [Local development setup](docs/development/LOCAL_SETUP.md)
- [Development diary](docs/development/2026-07-15-foundation-slice.md)
- [Phase 2 development diary](docs/development/2026-07-15-auth-yacht-slice.md)
- [Foundation verification record](docs/audit/2026-07-15-foundation-verification.md)
- [Phase 2 verification record](docs/audit/2026-07-15-phase-2-verification.md)
- [Portfolio case study](docs/portfolio/FOUNDATION_CASE_STUDY.md)
- [Phase 2 portfolio case study](docs/portfolio/AUTH_YACHT_CASE_STUDY.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [GitHub configuration record](docs/audit/GITHUB_CONFIGURATION.md)
- [Changelog](CHANGELOG.md)

## Data safety

This repository must contain no live client data, passports, KYC/CDD files, signed contracts, bank details, private contact lists, API credentials, or current confidential commercial terms. Development and portfolio material must use synthetic or explicitly sanitised data.
