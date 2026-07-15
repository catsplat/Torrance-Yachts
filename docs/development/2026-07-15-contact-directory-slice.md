# Development diary: contact directory slice

**Date:** 15 July 2026

**Branch:** `codex/phase-3-contacts`

## Objective

Build the master-data slice required before enquiries and bookings: one reliable record for each person and company, explicit yacht responsibilities, and a safe source for the captain-contact lookup required by booking task 2.A.

## Work completed

- Added contacts and companies with active/inactive lifecycle management.
- Modelled several controlled roles on one person rather than duplicating broker, captain, customer, or operations records.
- Added audited company memberships with job title and primary-company designation.
- Added audited yacht responsibilities with responsibility type, primary designation, notification eligibility, and internal notes.
- Built list, create, detail, and edit experiences for people and companies.
- Added contact text search plus role and lifecycle filters.
- Surfaced assigned operational contacts on yacht detail pages.
- Added server validation, request-context authentication, RLS, database constraints, actor attribution, synthetic fixtures, and automated tests.
- Recorded the architecture, schema, decision, audit evidence, and portfolio narrative.

## Important reasoning

### One person, several roles

The brief allows the same person to be, for example, both broker and customer. Separate role-specific tables would duplicate emails and phone numbers and make future email matching unreliable. A canonical contact owns identity details while a controlled role set describes what that person can represent.

### Responsibilities belong to relationships

Being a captain is a general role; being the primary captain of a particular yacht is a relationship. The yacht link therefore records responsibility, primary status, notification eligibility, and notes without placing yacht-specific state on the person.

### Durable records deactivate rather than disappear

Past enquiries, bookings, and audits will need to continue resolving historical people and companies. The interface uses active/inactive lifecycle controls. PostgreSQL still permits an administrator to hard-delete an unreferenced record, but routine staff workflows do not expose that action.

### PostgreSQL remains authoritative

The original workflow mentions a Google Sheet of captain details. Phase 3 establishes the protected PostgreSQL record as the source of truth. A later Sheet can be an import or synchronised view, never the data the booking workflow depends on.

## Problems found and resolved

- Optional blank form values initially reached validation as `null`; parsers now normalise empty optional fields before validation.
- Local Supabase type generation needed the same custom Docker network as database testing.
- The first seed UUIDs did not use valid version/variant bits accepted by strict Zod UUID validation; fixtures were corrected while remaining deterministic and synthetic.
- Running `next build` beside a long-running `next dev` process left stale Server Action state during browser testing. Restarting the development server resolved it; future production builds should not share the worktree concurrently with the dev server.

## Scope deliberately deferred

- enquiry/contact communication history;
- Google Sheets import or synchronised directory views;
- Telegram, email, SMS, and WhatsApp delivery;
- notification dispatch and retry behaviour;
- production contact migration and deduplication;
- public contact self-service or external accounts.

The next vertical slice can now link enquiries to a customer, charterer, broker/company, and requested yacht without inventing duplicate master data.
