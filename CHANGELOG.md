# Changelog

All notable project changes are recorded here. The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

### Added

- Server-side, cursor-paginated Enquiries register queries with PostgreSQL
  filtering/search/counts, URL-preserved filters, supporting indexes and
  database coverage for complete historical results.
- Server-side, cursor-paginated Email inbox queries with PostgreSQL
  classification/search/counts and a separately accurate review-required count.
- Administrator-only rehearsal runs with their own fictional yacht/contact/email
  fixtures, protected record mapping, and a fail-closed reset for the supported
  pre-booking rehearsal scope.
- A fail-closed private document quarantine pipeline: byte-signature validation,
  SHA-256 evidence, ClamAV scanning, explicit scan/release states, blocked
  signed URLs and Drive sync until clean release, and synthetic scanner tests.
- A local loopback and production-internal ClamAV service definition plus
  database-enforced scanner/release audit history.
- Bounded, capability-scoped automation delivery dispatch with three concurrent
  workers, a 25-second execution limit, short provider timeouts, jittered
  exponential retries, retry caps, permanent-failure visibility, and queue
  health metrics.
- A private production deployment topology using an outbound-only Cloudflare
  Tunnel, no direct application/n8n ingress, bounded containers, least-privilege
  runtime settings, health checks, and rotating local logs.
- An administrator-only, local full-charter rehearsal which exercises the live
  enquiry, offer, booking, availability-buffer, document-checklist and
  dependency-aware task commands with a separate fictional yacht, plus an
  atomic run-scoped reset.

- A definitive project completion register separating locally complete hosted
  scope, optional mirrors, the future desktop edition, and eight client-owned
  activation gates.
- Executable inactive n8n Gmail intake, mark-read, and archive workflows, raw
  trigger payload normalisation, authenticated shared ingestion, replay tests,
  and capability-scoped provider leases.
- Static n8n workflow validation and a production environment preflight which
  reports missing configuration without printing secret values.
- A production-environment guard at every automation delivery claim/result
  boundary, so the explicitly named local n8n simulator cannot claim or mark
  real provider work complete outside `APP_ENVIRONMENT=development`.
- Secure one-click Telegram staff pairing through the company bot, with
  expiring deep links, token hashes, webhook-secret verification, one-time
  database completion, and replay protection.
- A guided personal setup experience for staff phone, alert email, Telegram
  delivery, notification topics, and Google inbox connections.
- Official Google OAuth authorisation-code flow with PKCE, verified-account
  lookup, encrypted Vault storage, secure state validation, and a company-owned
  server-only OAuth application configuration.
- Administrator-only Company connections settings, separating provider/n8n
  controls from the daily notification delivery centre.
- Development-only Offline Rehearsal controls that inject a clearly fictional
  email through the real local inbox/AI-review boundary without external
  providers.
- A local Ollama structured-output provider for offline AI assurance, plus
  launch-gap and acceptance documentation.
- Local-only five-route email rehearsal, stable replay identifiers, a
  schema-valid Ollama acceptance test, and a fictional charter rehearsal map.
- Document quarantine/scanning production-gate documentation; real identity or
  client documents remain prohibited during local assurance.
- A documented four-point operations design system and an audit record for the
  post-workflow interface refinement.
- Accessible shared loading skeletons for booking, document, email, and task
  registers.
- A content-idempotent Google Sheets workbook snapshot command and a regression
  test for safe unchanged retries.

### Changed

- Protected booking documents now enter quarantine before human verification;
  infected files are removed from Storage while safe audit metadata is retained.

- Reorganised Settings around personal setup, workspace workflow, and company
  delivery/launch controls; removed OAuth secret entry from the staff interface.
- Refocused Integrations on notification approval and delivery health while
  retaining all company adapter controls in the administrator settings area.
- Standardised the authenticated shell, navigation, cards, controls, semantic
  colour tokens, dark palette, and dashboard action queue around the actual
  daily charter workflow.
- Removed the obsolete generic module placeholder route now that every
  authorised operational module has a concrete screen.
- Replaced the client-only dark-mode toggle with a persistent server-action
  preference and HttpOnly cookie.
- Updated local setup documentation with the token-protected administrator
  bootstrap and a non-destructive Studio recovery procedure.
- Made integration database tests independent of existing synthetic local
  delivery history.
- Updated Next.js, its ESLint configuration, and audited transitive runtime
  dependencies to compatible patched releases. The remaining audit findings are
  moderate and confined to the development-only shadcn CLI dependency chain.

## [0.14.0] - 2026-07-17

### Added

- Token-protected, request-time `/setup` workflow for creating the first
  administrator on an empty installation without public registration.
- Auth-triggered inactive bootstrap profiles and an atomic, least-privilege
  database command for uniqueness, role promotion, and workflow audit.
- Administrator integration-readiness page covering Gmail ingestion, personal
  Gmail alerts, Telegram, n8n, account email delivery, AI, and Yachtfolio.
- Local Mailpit and production SMTP guidance plus a complete provider-activation
  runbook.
- 15 additional PostgreSQL privilege/behaviour assertions and nine additional
  application tests for activation state, token handling, and validation.

### Changed

- Aligned profile phone and Telegram validation with PostgreSQL constraints.
- Added production environment controls for the temporary setup token, private
  n8n health endpoint, SMTP verification, and explicit AI provider.
- Distinguished credential presence from recent successful Gmail ingestion and
  provider health.

### Security

- Kept raw operational tables unavailable to the trusted service role; setup and
  readiness use narrow security-definer functions with redacted output.
- Compared the setup token in constant time, kept candidates inactive until the
  atomic promotion succeeds, and closed setup permanently once any profile exists.
- Kept SMTP and provider credentials outside browser-readable settings, logs,
  audit payloads, and source control.
- Retained explicit operator activation for n8n and human completion/audit for
  Yachtfolio.

### Known limitations

- Provider credentials, client-owned accounts, SMTP, infrastructure, synthetic
  provider acceptance, policies, training, and sign-off remain required before
  live data is permitted.
- The packaged desktop edition remains a separately documented future version.

## [0.13.0] - 2026-07-16

### Added

- Personal staff alert settings for email, phone, Telegram chat ID, delivery
  channels, operational topics, and optional AI summaries.
- Per-user Gmail OAuth credential storage encrypted in Supabase Vault with
  redacted status, audit events, and secure disconnect/deletion.
- Real personal notification centre, unread header badge, mark-read controls,
  and authorised cross-module workspace search.
- Persistent light/dark theme toggle.
- Automatic bounded email AI analysis before notification materialisation so
  staff alerts can include labelled summaries and suggested replies.
- Application provider adapter for internal Telegram alerts, internal Gmail
  alerts, and approval-controlled Gmail draft creation.
- Task-page communication preparation for KYC, captain contact, captain booking
  notification, and broker follow-up work.

### Changed

- Reorganised navigation and dashboard around the client's daily sequence:
  Inbox, Enquiry, Offer, Booking, Operations, and Follow-up.
- Replaced the dashboard's 1,000-row task count with exact count queries and a
  bounded priority list.
- Updated the supplied numbered task descriptions to describe the completed
  document, invoice, notification, and payment capabilities.
- Clarified that n8n schedules automation while PostgreSQL and the application
  retain business logic and personal credential isolation.

### Security

- Restricted automatic sending to internal staff alerts.
- External Gmail operations create drafts only after human approval.
- Kept OAuth secrets out of browser-readable tables, API payloads, n8n workflow
  definitions, logs, and source control.
- Added RLS and database behaviour tests for personal preferences, notification
  privacy, Vault lifecycle, credential ownership, and external draft approval.

## [0.12.0] - 2026-07-16

### Added

- Evidence-based launch-readiness register with administrator review, required
  acceptance gates, configuration presence reporting, and backup/restore records.
- Settings-launched guided tutorial with real-interface spotlights, pause/resume,
  permanent training history, and an isolated resettable synthetic
  enquiry-to-follow-up practice workflow.
- Administrator user management for invitations, roles, active access, phone and
  Telegram details, plus secure password-recovery and password-update flows.
- Public minimal liveness and bearer-protected readiness endpoints covering
  database access, configuration, delivery failures, and recent restore evidence.
- Reproducible production Compose package for standalone Next.js, pinned n8n
  Community Edition, and Caddy HTTPS on a protected Linux VPS.
- Reviewed n8n `2.30.6`; retained the verified `2.30.5` image because the new
  container could not be fetched and validated, and the upstream patch contains
  no declared security fix or breaking change.
- Encrypted logical database/private-storage backup tooling, documented recovery,
  and a successful disposable local restore drill with checksum evidence.
- Deployment, incident response, retention/privacy, maintenance, acceptance,
  staff quick-start, desktop-direction, architecture, audit, and portfolio records.

### Security

- Added a per-request nonce Content Security Policy, production HSTS, restrictive
  browser permissions, cross-origin controls, bounded Server Actions, and
  authenticated operational monitoring.
- Added twelve-hour absolute and two-hour inactivity session limits.
- Kept tutorial data separate from operational records and proved that practice
  actions cannot create notifications or external deliveries.
- Protected launch/backup evidence and user administration with RLS,
  database-owned commands, last-administrator safeguards, and durable audit events.

### Known limitations

- `v0.12.0` is a technically verified release candidate, not evidence that the
  production system is live.
- Client-owned Supabase, domain/VPS, mailbox, Telegram/Google credentials,
  off-site backup destination, policies, macOS acceptance, training, and final
  launch sign-off remain required before live data is permitted.
- The downloadable local desktop distribution is documented for later work and
  is not part of this hosted release.

## [0.11.0] - 2026-07-16

### Added

- Central notification records with recipient, channel, priority, human approval,
  delivery state, and application action links.
- Generic leased integration outbox with idempotency, retry/backoff, provider IDs,
  visible failures, and administrator retry.
- Operational calendar generated from bookings, payment instalments, and due tasks,
  plus duplicate-protected private Google Calendar delivery records.
- Controlled one-way Google Sheets snapshots and explicit verified-document Google
  Drive copy requests.
- Private versioned invoice profiles and deterministic commission invoice PDF
  generation into protected document storage.
- Pinned local n8n Community Edition Docker setup, importable workflows, adapter
  API contracts, and a development-only delivery simulator.
- Integrations workspace, notification approvals, delivery history, calendar,
  invoice Settings, and dashboard automation-failure counts.

### Security

- External credentials remain in n8n/secret storage and are never stored in
  PostgreSQL or source control.
- Gmail creates drafts only, Calendar sends no attendee updates, Sheets is one-way,
  and Drive requires a verified document plus an explicit human reason.
- n8n receives no authority to change offers, bookings, tasks, payments, AI
  reviews, or Yachtfolio completion.

### Known limitations

- Real bot, mailbox, Google OAuth, calendar, Drive folder, and workbook credentials
  remain deliberately unconfigured until Phase 12 deployment acceptance.
- The included delivery simulator is synthetic-only and must never be enabled for
  production data.

## [0.10.0] - 2026-07-16

### Added

- Provider-neutral AI service with a deterministic local development provider and
  optional OpenAI Responses API adapter.
- Structured email classification, enquiry facts, summaries, draft responses,
  confidence, and exact-source evidence.
- Selected contract-clause extraction for verified charter agreements without
  transmitting identity-document attachments.
- Human correction history, approve/reject decisions, provider/model/prompt
  provenance, idempotent runs, and a central AI review queue.
- Separate human application of reviewed email and contract values so model output
  cannot directly change authoritative operational records.
- Versioned administrator-managed KYC request, captain-contact, and broker
  follow-up communication templates.
- Phase 12 requirement for a Settings-launched guided tutorial and isolated,
  resettable synthetic email-to-follow-up practice workflow.

### Security

- Treats all email and contract text as untrusted, bounds model input/output,
  validates Structured Outputs with Zod, and verifies evidence excerpts.
- Keeps provider credentials server-only, disables OpenAI response storage, and
  excludes passport/KYC attachments from model processing.
- Restricts run completion/failure to the trusted service role and blocks direct
  mutation of AI provenance, approved templates, and review history.

### Known limitations

- Phase 10 does not send drafts or notifications and does not execute Gmail,
  Telegram, calendar, Google Drive/Sheets, or Yachtfolio actions.
- Contract extraction requires relevant clauses to be pasted manually.
- The local deterministic provider is intended for development and workflow
  testing, not semantic equivalence with a production model.

## [0.9.0] - 2026-07-16

### Added

- Phase 9 authenticated Gmail/n8n ingestion endpoint with bounded payload validation
  and idempotency across provider events and Gmail message IDs.
- Durable email threads, immutable message content, attachment metadata,
  classification history, and provider-action outbox records.
- Deterministic routing for known enquiry threads, configured internal domains, and
  circular/newsletter headers, with a human review queue for uncertain messages.
- Human-approved new-enquiry creation that creates or reuses the sender contact, and
  both automatic and manual follow-up association.
- Settings controls for status-specific inactivity timeouts and internal email
  domains, plus audited archival sweeps that remove dead ends from normal views
  without deleting history.
- Client requirements traceability across the full twelve-phase programme.

## [0.8.0] - 2026-07-16

### Added

- Phase 8 private booking-document storage with booking-scoped paths, controlled
  MIME types, a 20 MB limit, and five-minute signed access links.
- Automatically generated booking document requirements, human verification,
  versioned metadata, and append-only document history.
- Reviewed contract-field drafts, explicit approval, one-to-three instalment
  payment schedules, deterministic commission calculations, and task due-date
  synchronisation.
- Live document/payment dashboard counts and protected booking workspaces.

## [0.7.0] - 2026-07-16

### Added

- Versioned configurable booking-task templates with editable draft steps, dependency graphs, reminders, escalation settings, due-date anchors, optionality, and administrator approval.
- Atomic and idempotent generation of the supplied sixteen-record booking workflow when a signed booking is confirmed.
- Dependency-aware task blocking, completion, reopening, assignment, priority, schedule changes, append-only notes, and permanent history.
- Booking checklist, unified task register, task detail, template management, search, filters, live dashboard metrics, and ad-hoc task creation/cancellation.
- Automatic task rescheduling after reviewed charter-date amendments and cancellation of open work when a booking is cancelled.
- Global recovery UI and defensive HTTP response headers.

### Security

- Added RLS and least-privilege grants to every task-engine table.
- Blocked direct task/template lifecycle changes, deletion, history writes, dependency cycles, cross-booking dependencies, and approved-template mutation.
- Restricted template configuration to administrators and retained active-user validation inside every task command.

### Known limitations

- Payment tasks remain blocked until Phase 8 supplies reviewed contract instalment dates.
- Reminder and escalation settings are stored but do not send notifications until Phase 11.
- Phase 7 remains local-only, synthetic-only, and not approved for live booking operations.

## [0.6.0] - 2026-07-16

### Added

- Human-confirmed authoritative bookings linked to their originating enquiry and sent offer.
- Atomic one-day availability buffers before and after every charter, with database-enforced overlap prevention.
- Controlled booking amendments, charter start/completion/cancellation lifecycle, permanent reasons, and enquiry synchronisation.
- Live booking register, availability checker, confirmation review, booking detail, yacht reservation, and dashboard views.
- Explicit pending/completed/reopened Yachtfolio actions with evidence and history.
- Phase 6 architecture, schema, decision, development, verification, and portfolio documentation.

### Security

- Required active internal identity, a sent matching offer, awaiting-signatures state, explicit all-party signature attestation, and reviewed terms for confirmation.
- Blocked direct booking/reservation/status/history mutation and all application deletion paths.
- Added RLS and least-privilege grants to every Phase 6 record.
- Made the database transaction—not an advisory page check—the authority for conflict prevention.

### Known limitations

- Phase 6 remains local-only, synthetic-only, and not approved for live contracts or bookings.
- Booking confirmation does not yet create the operational task sequence, document checklist, payment schedule, reminders, notifications, or calendar records.
- Yachtfolio work is deliberately manual and must be recorded by a staff member; no Yachtfolio API is connected.
- n8n and all other external integrations remain disconnected until Phase 11.

## [0.5.0] - 2026-07-15

### Added

- Yacht commercial profiles with editable positioning, VAT, port guidance, fuel guidance, specifications, features, and other offer source facts.
- Exact, dated, non-overlapping weekly rate periods and deterministic short-charter fee calculation.
- Approved public sales-material records separated from future private document storage.
- Versioned yacht offer templates with allow-listed placeholders and an explicit approval lifecycle.
- Immutable numbered offer snapshots linked to enquiries, rates, templates, and preceding offer revisions.
- Separate human actions for draft creation, editing, approval, and recording an externally sent offer.
- Offer search, status filters, enquiry links, commercial configuration screens, dashboard approval counts, lifecycle history, workflow events, and audit attribution.
- Phase 5 architecture, database, decision, development, verification, automation, and portfolio documentation.

### Security

- Enabled Row Level Security and removed anonymous access for every commercial and offer table.
- Prevented direct offer-state changes, direct lifecycle-history/event insertion, offer deletion, and mutation of approved or sent snapshots.
- Required active internal identities for reads and mutations, with actor fields derived inside PostgreSQL.
- Restricted offer material to explicitly active, approved HTTPS links and kept sensitive documents out of this slice.
- Added a database command boundary for recording an offer as sent before the enquiry may enter `offer_sent`.
- Made stale local sessions recoverable at the login form after an Auth reset.

### Known limitations

- Version 0.5.0 remains local-only, synthetic-only, and unapproved for production or live commercial data.
- Recording an offer as sent does not send email; it records a human-confirmed external action.
- Offers do not reserve yacht dates. Authoritative bookings and buffered availability arrive in Phase 6.
- Production commercial terms and the supplied BOJI wording must be entered as protected business data, never committed to the repository.
- n8n, Gmail, Telegram, AI, documents, and all external integrations remain disconnected.

## [0.4.0] - 2026-07-15

### Added

- Manual enquiry list, creation, detail, and editing workflows linked to authoritative contacts, companies, yachts, and internal owners.
- Structured charter dates, guest count, ports, budget, currency, priority, stable enquiry references, and manual source provenance.
- Search plus state, priority, and yacht filters for the enquiry pipeline.
- Append-only internal, requirement, and follow-up notes.
- Database-enforced enquiry state transitions with mandatory reasons and immutable lifecycle history.
- Durable `EnquiryCreated` and `EnquiryStatusChanged` workflow events for later idempotent automation.
- Live dashboard enquiry count and pipeline while later modules remain visibly labelled synthetic.
- Synthetic enquiry fixtures, 10 additional application tests, and 37 additional database permission/behaviour assertions.
- A twelve-phase delivery map, client status report, and Phase 4 architecture, decision, schema, development, audit, and portfolio records.

### Security

- Enabled Row Level Security and removed anonymous access for all Phase 4 tables.
- Restricted enquiry reads and mutations to active internal profiles.
- Validated that newly assigned contacts, companies, yachts, and owners are active and hold the required operational role.
- Blocked direct state updates, invalid transitions, state changes without reasons, and every Phase 4 path to `booked`.
- Made notes append-only, lifecycle history and workflow events read-only to the application, and enquiries non-deletable.
- Kept actor attribution, lifecycle records, workflow events, and audit events database-owned.

### Known limitations

- Version 0.4.0 remains local-only, synthetic-only, and not approved for live enquiries.
- Requested enquiry dates do not reserve yacht availability; confirmed booking reservations arrive in Phase 6.
- Offer versions and yacht commercial templates arrive in Phase 5.
- Gmail, AI, notifications, documents, tasks, and external integrations remain disconnected.
- Workflow events are recorded but are not yet consumed or retried.
- Enquiry search is intentionally bounded to 500 authorised records.

## [0.3.0] - 2026-07-15

### Added

- Canonical contact records with multiple validated operational roles.
- Company records and explicit primary/job-title contact relationships.
- Yacht contact assignments for captains, managers, operations, notification recipients, crew, and other responsibilities.
- Contact and company list, create, detail, and edit interfaces with active/inactive lifecycle controls.
- Search plus contact role and lifecycle filters.
- Operational-contact summaries on yacht detail records.
- Synthetic contact, company, membership, and yacht-responsibility seed fixtures.
- Contact-directory validation tests and 28 additional database permission/behaviour assertions.
- Phase 3 architecture, decision, schema, development, audit, and portfolio records.

### Security

- Enabled Row Level Security and removed anonymous access for all Phase 3 tables.
- Enforced active internal profiles for every directory read and mutation.
- Restricted contact and company hard deletion to administrators while retaining deactivation for normal lifecycle management.
- Enforced one primary company per contact and one primary contact per yacht responsibility in PostgreSQL.
- Added database-owned actor attribution and audit events for master records and relationship changes.
- Kept all development fixtures explicitly synthetic and all integrations disconnected.

### Known limitations

- Version 0.3.0 remains local-only and is not approved for live contact data.
- Communication history begins with the enquiry/email slice and is not part of the master directory.
- Notification eligibility is recorded but no Telegram, email, SMS, or WhatsApp message is sent yet.
- Search is intentionally bounded to 500 authorised rows; database-backed search is required before that becomes insufficient.
- Hard deletion has no user-interface control by design; staff deactivate durable master records instead.

## [0.2.0] - 2026-07-15

### Added

- Reproducible local Supabase development configuration, migration, and synthetic seed data.
- Individual email/password authentication with public registration disabled.
- Verified server-side workspace protection and responsive sign-out controls.
- Internal profiles with `administrator` and `staff` roles and active-user status.
- Database-backed yacht list, detail, create, and edit experiences.
- Yacht specifications, operational status, preferred ports, and per-yacht notification phone numbers.
- Append-only database audit events for yacht inserts, updates, and deletions.
- Zod yacht-form validation, unit coverage, loading UI, and a recoverable error boundary.
- A dedicated CI job for migrations, 14 PostgreSQL permission/behaviour tests, and database linting.
- Authentication, schema, development, audit, and portfolio documentation for the slice.

### Security

- Enabled Row Level Security on every Phase 2 application table.
- Removed all anonymous table privileges.
- Limited yacht deletion to active administrators at the database boundary.
- Prevented users from promoting or reactivating themselves.
- Derived application identity from verified Supabase claims rather than unverified session data.
- Kept local credentials and generated environment values outside version control.

### Known limitations

- The implementation is local-only until a production Supabase project and deployment review are approved.
- Password recovery, invitations, and administrator user-management screens are not yet implemented.
- The dashboard still contains labelled synthetic preview metrics.
- Yacht deletion is intentionally database-authorised but has no user-interface control yet.
- Yacht charter availability will be derived from future booking records and is not stored as a manual yacht flag.
- Documents and all external integrations remain disconnected.

## [0.1.0] - 2026-07-15

### Added

- Approved, sanitised project brief covering the full enquiry-to-charter workflow.
- Traceable interpretation of the original hand-drawn product and workflow sketch.
- Next.js App Router foundation with TypeScript, Tailwind CSS, ESLint, and npm scripts.
- shadcn/ui foundation using current Base UI primitives.
- Responsive workspace shell with desktop sidebar and mobile navigation drawer.
- Dashboard preview for enquiries, tasks, bookings, documents, schedule, pipeline, and audit activity.
- Placeholder routes for Enquiries, Bookings, Tasks, Yachts, Contacts, Documents, Calendar, and Settings.
- Internal-only search-engine metadata and reduced-motion accessibility handling.
- Responsive application icon and verified semantic navigation links.
- Architecture, decision, audit, development, security, and portfolio documentation.
- Project-specific coding-agent rules in `AGENTS.md`.
- GitHub Actions quality checks, code ownership, contribution guidance, structured issue and pull-request templates, and Dependabot configuration.
- Repository configuration audit record and consistent Node/editor/line-ending settings.

### Security

- Used labelled synthetic fixtures only.
- Kept all external services disconnected.
- Added a tested npm override for the patched PostCSS version required by CVE-2026-41305.
- Confirmed `npm audit` reports zero known vulnerabilities.

### Known limitations

- Authentication and authorisation are not implemented.
- All dashboard values are synthetic, static fixtures.
- Navigation destinations are foundation placeholders.
- Buttons, search, task completion, and notifications do not yet mutate data.
- This version must not be deployed or used for real client information.
