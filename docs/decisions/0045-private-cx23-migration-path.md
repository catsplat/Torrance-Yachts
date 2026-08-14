# ADR 0045: Private CX23 migration path

**Status:** Accepted
**Date:** 14 August 2026

## Context

The selected low-cost hosted topology keeps PostgreSQL inside the VPS's private
Docker network. A GitHub-hosted deployment runner must therefore not receive a
database connection string or require a public PostgreSQL port simply to run
migrations. An earlier deployment workflow still used the retired managed-
Supabase/n8n package and attempted to run `supabase db push` from GitHub Actions.
That contradicted the selected CX23 architecture.

## Decision

- GitHub Actions stages the reviewed SQL migration files, deployment scripts and
  lean CX23 Compose definitions on the VPS over restricted SSH.
- The VPS starts only the private Supabase core, then applies each reviewed
  migration transactionally through the local `db` container.
- Applied versions and a non-secret file checksum manifest are recorded on the
  VPS. The post-deploy verifier fails if any reviewed migration is absent.
- The application image is pulled with a client-owned read-only GHCR credential
  in a temporary Docker configuration. It is not stored in the user's Docker
  credential file.
- The deployment package has no hosted n8n Compose service, credentials or
  workflow import. The application-owned worker is the production scheduler;
  local n8n remains a development/rehearsal adapter.

## Consequences

- PostgreSQL remains unexposed and GitHub cannot accidentally become a database
  administration path.
- Each release needs a deliberately staged migration package, but it remains
  reproducible from the reviewed source tag.
- Rollbacks remain application-image rollbacks. Database changes follow the
  existing expand/migrate/contract discipline and are never silently reversed.
