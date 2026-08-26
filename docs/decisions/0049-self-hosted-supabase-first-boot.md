# ADR 0049: Bootstrap the self-hosted Supabase core before application release

## Status

Accepted — 2026-08-17.

## Context

The private CX23 pilot hosts PostgreSQL, GoTrue, PostgREST and Storage on one
internal Docker network. The application requires Supabase Vault to preserve
the encrypted, per-user integration-credential boundary.

On a new volume, the previous database image did not include the Vault
extension used by the approved schema. The official Supabase PostgreSQL image
also creates baseline `auth` helper functions before GoTrue runs its own
migrations. GoTrue must own those functions in order to migrate them.

## Decision

Use the same pinned official PostgreSQL image as the local Supabase stack and
run a one-shot, private `bootstrap` container after PostgreSQL becomes healthy
and before Auth, REST or Storage starts. It:

1. sets passwords for only the internal Supabase service roles;
2. enables `supabase_vault` in the private database; and
3. transfers ownership of baseline `auth` functions to GoTrue's dedicated
   service role.

The bootstrap container has no host port, runs on the internal network, has a
read-only root filesystem, dropped capabilities and a temporary `/tmp`. Auth,
REST and Storage are dependent on its successful completion.

The PostgreSQL and vendor ClamAV/Caddy entrypoints retain the capabilities they
need only during initialisation or executable start-up. Their network exposure
remains unchanged: PostgreSQL, Kong, Storage and ClamAV have no host ports;
the Caddy gateway is bound only to loopback for the Tailscale pilot.

## Consequences

- An empty host can boot the approved database schema without manual SQL.
- Vault remains available for encrypted per-user OAuth and AI-provider
  settings; secrets never move into the browser or repository.
- A later image change must be tested from a fresh volume because this
  bootstrap contract is part of the platform foundation.
- These controlled vendor-runtime exceptions are documented rather than being
  hidden as ad-hoc manual recovery.
