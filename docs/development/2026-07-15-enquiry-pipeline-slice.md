# Development diary: manual enquiry pipeline slice

**Date:** 15 July 2026

**Branch:** `codex/phase-4-enquiries`

## Objective

Build a complete manual enquiry workflow before adding offers, bookings, email, or AI: create an enquiry from authoritative master data, edit its requirements, record permanent notes, progress it safely, and expose live operational counts.

## Work completed

- Added enquiries linked to eligible customer/charterer contacts, brokers, companies, yachts, and internal owners.
- Added generated references, priorities, dates, guests, ports, budgets, and manual provenance.
- Implemented database-enforced state transitions with mandatory reasons.
- Added immutable lifecycle history, append-only categorised notes, durable workflow events, and audit attribution.
- Built list, search, status/priority/yacht filters, create, detail, and edit experiences.
- Added a dedicated transition control instead of allowing status edits in the general form.
- Replaced the dashboard's enquiry preview with live open-enquiry and pipeline counts while retaining clear labels on later synthetic modules.
- Added synthetic fixtures, Zod validation, application tests, database security/behaviour tests, schema linting, and maintained documentation.

## Important reasoning

### Manual before automated

Email and AI cannot be tested safely until the application has a correct destination for reviewed results. Phase 4 proves the operational model using manual input. Later integrations will call the same rules rather than create a parallel workflow.

### Booking is a command, not a label

Changing an enquiry to Booked will eventually create a booking, reserve buffered yacht dates, and start dependent work. A status dropdown cannot provide that atomic guarantee. Phase 4 therefore stops at awaiting signatures; Phase 6 adds the reviewed booking-confirmation command.

### History does not disappear

Operational enquiries are cancelled or archived, not deleted. Notes are append-only and state transitions require reasons. This provides a defensible timeline for later email, offer, booking, and automation activity.

### Database rules outlive interfaces

The interface filters contacts by role and presents only allowed state targets, but PostgreSQL repeats those checks. This protects the business workflow when future Gmail, AI, n8n, Sheet, or API adapters are introduced.

## Problems found and resolved

- PostgreSQL's comparison with an unset custom setting can evaluate to null; the transition guard now uses `IS DISTINCT FROM` so an unset authorisation flag cannot bypass it.
- The current local Supabase CLI no longer offers the former general SQL seed command, so the documented SQL seed was applied through the local PostgreSQL container while preserving the local user.
- The Vitest configuration does not automatically resolve the application's path alias in test imports; enquiry validation tests use explicit relative imports.
- Eligible-reference validation was strengthened in PostgreSQL after reviewing the difference between a valid foreign key and an operationally valid customer, broker, owner, or yacht.

## Scope deliberately deferred

- yacht rates, sales materials, offer templates, offer versions, and send approval;
- booking confirmation, availability reservations, and date-conflict detection;
- task templates, reminders, documents, payments, email, AI, and notifications;
- event consumption, retry state, and integration idempotency;
- production data migration and production approval.
