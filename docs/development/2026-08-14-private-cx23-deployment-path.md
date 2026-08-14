# Private CX23 deployment path

## Purpose

Close the final internal contradiction between the selected lean self-hosted
CX23 topology and the automated release path before configuring Cloudflare or
client-owned provider credentials.

## What changed

- Retired the unused hosted n8n Compose package and its old environment
  contract; production now has one supported runtime profile:
  `deploy/self-hosted-cx23`.
- Changed the deployment workflow to stage the reviewed Compose files, migration
  directory and deployment scripts on the VPS.
- Added a private migration runner. It starts from the deployed source files,
  reaches PostgreSQL only through Docker's `torrance-internal` network and
  records safe version/checksum evidence on the VPS.
- Added lean-runtime verification for the application, worker, ClamAV and the
  five essential Supabase services. No service publishes a host port.
- Added a temporary read-only GHCR authentication path for image pulls rather
  than persisting a registry credential in the deployment account's Docker
  configuration.

## Why it matters

The VPS can now remain private by design: GitHub is an artifact and SSH staging
path, not a database administration path. The production worker owns scheduling;
local n8n remains available for development and fictional rehearsal only.

## Deferred operator work

The corrected path still needs the pending domain activation, Cloudflare Tunnel
token, SMTP, read-only GHCR package credential and staged provider values before
the first synthetic staging deployment. No live data or credentials were added.

The initial single VPS has a separately guarded temporal-staging reset command.
It requires staging-only environment/hostname checks, an explicit destructive
phrase and a non-secret backup-evidence reference before it removes the private
Supabase database and Storage volumes.
