# Security policy

## Current deployment status

This repository contains the technically verified `v0.12.0` release candidate but
is not yet approved for live Torrance Yachts data. Production approval requires
all required evidence in `/settings/launch`, client-owned infrastructure and
credentials, policy acceptance, staff acceptance, and recorded go-live sign-off.

## Reporting a concern

Report security concerns privately to the repository owner. Do not include credentials, client information, identity documents, contracts, or exploit data in a public issue.

## Repository data rules

Never commit:

- API keys, OAuth credentials, tokens, passwords, or service-role keys;
- live customer, broker, captain, or employee contact data;
- passports, KYC/CDD files, signed contracts, or invoices;
- personal bank details;
- production database exports or storage objects;
- confidential current rates, references, or communication templates unless explicitly sanitised and approved.

Use synthetic test data. Example environment files may contain variable names only, never working values.

## Production gate

Before production, the project requires reviewed authentication, database Row Level Security, private object storage, server-side validation, least-privilege integration scopes, rate controls, audit logging, backup and restore tests, monitoring, retention rules, and an incident runbook. The full requirements are maintained in `docs/PROJECT_BRIEF.md`.

## Implemented controls

- public registration is disabled;
- protected routes verify Supabase authentication claims on the server;
- every operational, integration, tutorial, launch, and backup-evidence table uses
  PostgreSQL Row Level Security and least-privilege grants;
- anonymous roles have no application-table privileges;
- active staff can read and maintain yacht records, while deletion is administrator-only;
- role and active-status changes are protected against self-escalation;
- yacht, contact, company, and relationship mutations create database-owned audit events;
- contacts support controlled multi-role membership without duplicating personal details;
- primary company and yacht-responsibility relationships are protected by database uniqueness rules;
- contact and company hard deletion is administrator-only; normal lifecycle management uses deactivation;
- enquiry references are checked for active, role-appropriate contacts, companies, yachts, and internal owners;
- enquiry state changes use a database-enforced transition command with a required reason;
- enquiries cannot be deleted, notes are append-only, and lifecycle history/workflow events are application read-only;
- Phase 4 cannot move an enquiry to `booked`; that state requires the future human-confirmed booking operation;
- form input is validated on the server before database access;
- environment files and local credentials are ignored by Git.
- consequential actions use reviewed database commands; AI and integrations cannot
  independently confirm bookings, alter authoritative records, or send unapproved
  communications;
- identity documents and contracts use private Storage paths and short-lived
  signed access rather than public object URLs;
- production responses use a nonce-based Content Security Policy, frame/MIME/
  referrer/permissions controls, cross-origin restrictions, and HSTS;
- sessions have absolute and inactivity time limits, and administrator changes
  protect the current and final administrator;
- liveness exposes no internal state; readiness requires a timing-safe bearer
  secret and checks configuration, database access, failures, and restore age;
- encrypted backup/export and documented restore tooling have passed a disposable
  local recovery drill;
- tutorial practice is isolated from operational records and cannot queue external
  work.

These controls are defence in depth. Production still requires environment-
specific URL and redirect configuration, scoped provider credentials, an off-site
encrypted backup destination, malware/quarantine acceptance, MFA consideration,
an independent access review, and a production restore test.

## Local service exposure

Supabase's local stack uses shared development keys and is never a production service. The project uses Supabase's recommended custom Docker network, but verification on Windows Docker Desktop showed that published API/database ports can still appear on `0.0.0.0`. Develop only on a trusted/private network with the host firewall enabled, verify Docker port mappings after startup, stop the stack when finished, and keep local data synthetic. See `docs/development/LOCAL_SETUP.md`.

## Dependency policy

- Use the smallest justified dependency set.
- Commit the lockfile.
- Run `npm audit`, linting, TypeScript checks, and a production build before a release.
- Do not apply forced dependency changes without reviewing their compatibility and testing the application.
