# Security policy

## Current deployment status

This repository is in development and is not approved for production deployment or live Torrance Yachts data. Phase 2 provides a tested local authentication and database-authorisation baseline; it is not a production security approval.

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

## Implemented local controls

- public registration is disabled;
- protected routes verify Supabase authentication claims on the server;
- all Phase 2 tables use PostgreSQL Row Level Security;
- anonymous roles have no application-table privileges;
- active staff can read and maintain yacht records, while deletion is administrator-only;
- role and active-status changes are protected against self-escalation;
- yacht mutations create database-owned audit events;
- form input is validated on the server before database access;
- environment files and local credentials are ignored by Git.

These controls are defence in depth. Production still requires environment-specific URL configuration, invitation and recovery policy, MFA consideration, private storage policies, backups, monitoring, and an independent access review.

## Local service exposure

Supabase's local stack uses shared development keys and is never a production service. The project uses Supabase's recommended custom Docker network, but verification on Windows Docker Desktop showed that published API/database ports can still appear on `0.0.0.0`. Develop only on a trusted/private network with the host firewall enabled, verify Docker port mappings after startup, stop the stack when finished, and keep local data synthetic. See `docs/development/LOCAL_SETUP.md`.

## Dependency policy

- Use the smallest justified dependency set.
- Commit the lockfile.
- Run `npm audit`, linting, TypeScript checks, and a production build before a release.
- Do not apply forced dependency changes without reviewing their compatibility and testing the application.
