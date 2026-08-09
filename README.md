# Torrance Yachts Charter Operations Platform

A private internal platform for managing Torrance Yachts' charter workflow, from the first enquiry email through booking operations and post-charter follow-up.

> **Development status:** All twelve implementation phases and the `v0.18.0`
> activation-readiness release are complete in the release candidate. Production
> activation remains blocked until client-owned infrastructure, credentials,
> policies, staff acceptance, training, and launch sign-off are recorded. Do not
> enter real client data yet.

## Current milestone

The current candidate provides the secured operational master-data, enquiry, offer, and booking layers:

- local Supabase/PostgreSQL development infrastructure;
- individual email/password identities with public registration disabled;
- protected workspace routes and verified server-side sessions;
- `administrator` and `staff` profiles with active-user controls;
- a database-backed yacht register with create, list, view, and edit operations;
- one canonical record per external person with several validated roles;
- company records and explicit person-to-company relationships;
- yacht-specific captain, manager, operations, crew, and notification responsibilities;
- yacht-specific operational notification phone numbers;
- search and role/status filtering for the internal directory;
- structured manual enquiries linked to customers/charterers, brokers, companies, yachts, and internal owners;
- enquiry dates, guests, ports, budget, priority, notes, search, and filters;
- database-enforced lifecycle transitions with mandatory reasons, immutable history, durable events, and audit attribution;
- human-confirmed bookings linked to sent offers and enquiries, with all-party signature attestation;
- one-day yacht availability buffers on both sides, database-enforced overlap prevention, and live availability checking;
- controlled booking amendments and lifecycle changes with reasons, history, durable events, and enquiry synchronisation;
- explicit pending/completed/reopened Yachtfolio manual actions;
- configurable versioned task templates and dependency graphs;
- generated booking checklists, assignees, reviewed schedules, reminders, notes, and completion/reopening audit;
- workflow-focused daily dashboard and grouped navigation following Inbox,
  Enquiry, Offer, Booking, Operations, and Follow-up;
- functional authorised cross-module search, personal notification centre, unread
  badge, and persistent dark mode;
- local deterministic and optional OpenAI-assisted email triage, structured enquiry extraction, summaries, and draft replies;
- selected contract-clause extraction with exact evidence, corrections, and a separate human application step;
- a central AI review queue plus versioned KYC, captain-contact, and broker-follow-up templates;
- per-user in-app, Telegram, and email alert routes, topic preferences, phone/chat
  details, and optional labelled AI summaries;
- encrypted per-user Gmail OAuth credentials in Supabase Vault;
- automatic bounded email AI analysis before alert materialisation;
- central notification review and delivery-failure controls;
- task-page KYC, captain-contact, captain-notification, and broker-follow-up draft
  preparation from approved templates and authoritative contacts;
- an internal calendar generated from bookings, payments, and tasks;
- idempotent Telegram, Gmail, Calendar, Drive, and Sheets delivery contracts;
- private versioned invoice profiles and deterministic commission PDF generation;
- pinned local n8n Community Edition with importable workflows and synthetic acceptance;
- a Settings-launched guided tutorial and isolated, resettable synthetic
  enquiry-to-follow-up practice workflow;
- administrator invitations, access management, and secure password recovery;
- launch acceptance, backup/restore evidence, health monitoring, incident,
  maintenance, retention/privacy, deployment, and staff-training runbooks;
- token-protected one-time first-administrator setup with no public registration;
- truthful integration-readiness status for Gmail, Telegram, n8n, Auth email,
  AI, and the audited manual Yachtfolio boundary;
- a standalone Next.js/n8n/Cloudflare-Tunnel Linux production package and a separately
  documented future desktop distribution;
- PostgreSQL Row Level Security and append-only audit events across all operational records and relationships;
- Zod validation, a recoverable error boundary, and synthetic seed records;
- 125 unit tests, 798 database permission/behaviour tests, 13 automated
  Chromium/Firefox/WebKit acceptance tests, database linting,
  deployment-package validation, and matching CI gates.

Confirmed bookings generate their workflow, private document checklist, reviewed contract data, payments, calendar records, reminders, and controlled delivery work. External adapters remain observable and cannot change operational authority. The application does not send consequential communications or update Yachtfolio automatically. Production approval is evidence-driven in `/settings/launch`; code completion alone does not permit live data.

## Technology foundation

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui using Base UI primitives
- Supabase Auth, PostgreSQL, and the Supabase local development stack
- Zod, Vitest, Playwright, and axe-core
- ESLint
- npm

n8n now runs locally through the pinned Docker setup. It schedules bounded
application automation and the remaining shared providers. Personal Gmail
credentials are entered by each staff member and encrypted in Vault; the company
Telegram bot token remains server-only. Live accounts remain disconnected until
acceptance. The deterministic local AI provider requires no paid service; OpenAI
is optional and server-only.

The recommended production topology is managed Supabase Pro plus a protected Linux
VPS running the standalone application, n8n Community Edition, and an outbound-only
Cloudflare Tunnel protected by Cloudflare Access. See
[production deployment](docs/operations/PRODUCTION_DEPLOYMENT.md) and
[launch acceptance](docs/operations/LAUNCH_ACCEPTANCE.md).

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

The Docker network command is a one-time setup recommended by Supabase. On Windows, verify the resulting port bindings and use a trusted/private network because Docker Desktop may still publish development ports on all host interfaces. Use synthetic data only. Fill the two blank values in the ignored `.env.local` using the API URL and publishable key printed by `npm run db:status`; never use the service-role key in the web application. Studio at `http://127.0.0.1:54323` is for local inspection. Create the first administrator through the temporary token-protected `http://localhost:3000/setup` route, then sign in normally. The complete bootstrap, Studio recovery, and network-verification procedure is in [local development setup](docs/development/LOCAL_SETUP.md).

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
- [Twelve-phase delivery map](docs/planning/DELIVERY_PHASES.md)
- [Current client progress summary](docs/client/2026-07-15-project-status.md)
- [Foundation architecture](docs/architecture/FOUNDATION.md)
- [Authentication and yacht-slice architecture](docs/architecture/AUTHENTICATION_AND_YACHT_SLICE.md)
- [Contact-directory architecture](docs/architecture/CONTACT_DIRECTORY_SLICE.md)
- [Enquiry-pipeline architecture](docs/architecture/ENQUIRY_PIPELINE_SLICE.md)
- [Commercial-offers architecture](docs/architecture/COMMERCIAL_OFFERS_SLICE.md)
- [Booking and availability architecture](docs/architecture/BOOKING_AVAILABILITY_SLICE.md)
- [Task-engine architecture](docs/architecture/TASK_ENGINE_SLICE.md)
- [Documents, contracts, and payments architecture](docs/architecture/DOCUMENTS_CONTRACTS_PAYMENTS_SLICE.md)
- [Email-ingestion architecture](docs/architecture/EMAIL_INGESTION_SLICE.md)
- [AI-assistance architecture](docs/architecture/AI_ASSISTANCE_SLICE.md)
- [Integrations, notifications, and calendar architecture](docs/architecture/INTEGRATIONS_NOTIFICATIONS_CALENDAR_SLICE.md)
- [Launch-readiness and tutorial architecture](docs/architecture/LAUNCH_READINESS_TUTORIAL_SLICE.md)
- [Personal alerts and workflow UX](docs/architecture/PERSONAL_ALERTS_AND_WORKFLOW_UX.md)
- [Automation and n8n boundary](docs/architecture/AUTOMATION_AND_N8N.md)
- [Phase 2 database schema](docs/database/PHASE_2_SCHEMA.md)
- [Phase 3 contact-directory schema](docs/database/PHASE_3_CONTACT_DIRECTORY_SCHEMA.md)
- [Phase 4 enquiry schema](docs/database/PHASE_4_ENQUIRY_SCHEMA.md)
- [Phase 5 commercial-offers schema](docs/database/PHASE_5_COMMERCIAL_OFFERS_SCHEMA.md)
- [Phase 6 booking and availability schema](docs/database/PHASE_6_BOOKING_AVAILABILITY_SCHEMA.md)
- [Phase 7 task-engine schema](docs/database/PHASE_7_TASK_ENGINE_SCHEMA.md)
- [Phase 8 documents and payments schema](docs/database/PHASE_8_DOCUMENTS_PAYMENTS_SCHEMA.md)
- [Phase 9 email schema](docs/database/PHASE_9_EMAIL_SCHEMA.md)
- [Phase 10 AI schema](docs/database/PHASE_10_AI_SCHEMA.md)
- [Phase 11 integrations schema](docs/database/PHASE_11_INTEGRATIONS_SCHEMA.md)
- [Phase 12 launch schema](docs/database/PHASE_12_LAUNCH_SCHEMA.md)
- [Architecture decisions](docs/decisions/0001-application-foundation.md)
- [Supabase identity and RLS decision](docs/decisions/0002-supabase-identity-and-rls.md)
- [Contact-directory modelling decision](docs/decisions/0003-contact-directory-model.md)
- [Enquiry state-machine decision](docs/decisions/0004-enquiry-state-machine.md)
- [Human-reviewed offer snapshots decision](docs/decisions/0005-human-reviewed-offer-snapshots.md)
- [Transactional booking reservations decision](docs/decisions/0006-transactional-booking-reservations.md)
- [Versioned dependency-aware task engine decision](docs/decisions/0007-versioned-dependency-aware-task-engine.md)
- [Private documents and reviewed contract data decision](docs/decisions/0008-private-documents-reviewed-contract-data.md)
- [Idempotent email-ingestion decision](docs/decisions/0010-idempotent-email-ingestion.md)
- [Provider-neutral human-reviewed AI decision](docs/decisions/0011-provider-neutral-human-reviewed-ai.md)
- [Transactional integration outbox decision](docs/decisions/0012-transactional-integration-outbox.md)
- [Production hosting topology decision](docs/decisions/0013-production-hosting-topology.md)
- [Personal alerts and encrypted OAuth decision](docs/decisions/0014-personal-alerts-encrypted-oauth.md)
- [One-time administrator bootstrap decision](docs/decisions/0015-one-time-administrator-bootstrap.md)
- [Local development setup](docs/development/LOCAL_SETUP.md)
- [Development diary](docs/development/2026-07-15-foundation-slice.md)
- [Phase 2 development diary](docs/development/2026-07-15-auth-yacht-slice.md)
- [Phase 3 development diary](docs/development/2026-07-15-contact-directory-slice.md)
- [Phase 4 development diary](docs/development/2026-07-15-enquiry-pipeline-slice.md)
- [Phase 5 development diary](docs/development/2026-07-15-commercial-offers-slice.md)
- [Phase 6 development diary](docs/development/2026-07-15-booking-availability-slice.md)
- [Phase 7 development diary](docs/development/2026-07-16-task-engine-slice.md)
- [Phase 8 development diary](docs/development/2026-07-16-documents-payments-slice.md)
- [Phase 9 development diary](docs/development/2026-07-16-email-ingestion-slice.md)
- [Phase 10 development diary](docs/development/2026-07-16-ai-assistance-slice.md)
- [Phase 11 development diary](docs/development/2026-07-16-integrations-automation-slice.md)
- [Phase 12 development diary](docs/development/2026-07-16-launch-readiness-slice.md)
- [Foundation verification record](docs/audit/2026-07-15-foundation-verification.md)
- [Phase 2 verification record](docs/audit/2026-07-15-phase-2-verification.md)
- [Phase 3 verification record](docs/audit/2026-07-15-phase-3-verification.md)
- [Phase 4 verification record](docs/audit/2026-07-15-phase-4-verification.md)
- [Phase 5 verification record](docs/audit/2026-07-15-phase-5-verification.md)
- [Phase 8 verification record](docs/audit/2026-07-16-phase-8-verification.md)
- [Phase 9 verification record](docs/audit/2026-07-16-phase-9-verification.md)
- [Phase 10 verification record](docs/audit/2026-07-16-phase-10-verification.md)
- [Phase 11 verification record](docs/audit/2026-07-16-phase-11-verification.md)
- [Phase 12 verification record](docs/audit/2026-07-16-phase-12-verification.md)
- [Phase 11 adapter contract](docs/integrations/PHASE_11_ADAPTER_CONTRACT.md)
- [Local n8n setup](automation/README.md)
- [Client requirements traceability](docs/planning/CLIENT_REQUIREMENTS_TRACEABILITY.md)
- [Portfolio case study](docs/portfolio/FOUNDATION_CASE_STUDY.md)
- [Phase 2 portfolio case study](docs/portfolio/AUTH_YACHT_CASE_STUDY.md)
- [Phase 3 portfolio case study](docs/portfolio/CONTACT_DIRECTORY_CASE_STUDY.md)
- [Phase 4 portfolio case study](docs/portfolio/ENQUIRY_PIPELINE_CASE_STUDY.md)
- [Phase 5 portfolio case study](docs/portfolio/COMMERCIAL_OFFERS_CASE_STUDY.md)
- [Phase 10 portfolio case study](docs/portfolio/AI_ASSISTANCE_CASE_STUDY.md)
- [Phase 11 portfolio case study](docs/portfolio/INTEGRATIONS_AUTOMATION_CASE_STUDY.md)
- [Phase 12 portfolio case study](docs/portfolio/LAUNCH_READINESS_CASE_STUDY.md)
- [Production operations runbooks](docs/operations/PRODUCTION_DEPLOYMENT.md)
- [Email and integration activation](docs/operations/EMAIL_AND_INTEGRATION_ACTIVATION.md)
- [Staff quick-start guide](docs/client/STAFF_QUICK_START.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [GitHub configuration record](docs/audit/GITHUB_CONFIGURATION.md)
- [Changelog](CHANGELOG.md)

## Data safety

This repository must contain no live client data, passports, KYC/CDD files, signed contracts, bank details, private contact lists, API credentials, or current confidential commercial terms. Development and portfolio material must use synthetic or explicitly sanitised data.
