# Changelog

All notable project changes are recorded here. The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

### Planned

- Local Supabase development environment and initial database migrations.
- Authentication boundary and protected workspace routes.
- First real vertical slice for yacht records using synthetic data.

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
