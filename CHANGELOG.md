# Changelog

All notable project changes are recorded here. The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

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

- Phase 5 remains a local, synthetic-only release candidate pending final clean-browser acceptance and pull-request review.
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
