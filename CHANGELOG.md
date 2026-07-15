# Changelog

All notable project changes are recorded here. The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

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

- Phase 3 remains local-only and is not approved for live contact data.
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
