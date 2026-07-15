# Security policy

## Current deployment status

This repository is in development and is not approved for production deployment or live Torrance Yachts data.

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

## Dependency policy

- Use the smallest justified dependency set.
- Commit the lockfile.
- Run `npm audit`, linting, TypeScript checks, and a production build before a release.
- Do not apply forced dependency changes without reviewing their compatibility and testing the application.
