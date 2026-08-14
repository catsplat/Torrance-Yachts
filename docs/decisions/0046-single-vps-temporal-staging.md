# ADR 0046: Single-VPS temporal staging

**Status:** Accepted
**Date:** 14 August 2026

## Context

The first hosted environment is one cost-controlled Hetzner CX23. Running a
second VPS only for staging would exceed the agreed launch budget. The project
still requires a staging acceptance before real messages, credentials or identity
documents are introduced.

## Decision

- The CX23 first runs a **synthetic staging** deployment on a distinct hostname,
  for example `staging.<approved-domain>`.
- Only fictional accounts, provider simulators and rehearsal documents are used
  in that stage. It has its own environment-specific browser image.
- After staging acceptance and before any real configuration is entered, an
  authorised operator takes and verifies a final staging backup, removes the
  staging database and Storage volumes, confirms the reset, and changes the
  runtime to the production hostname.
- Production is rebuilt from the same accepted source tag but as a separate
  production-labelled image. It starts with an empty operational database.
- Staging and production are never run against the same database, hostname or
  browser-safe Supabase configuration.

## Consequences

- The first launch stays within the CX23 budget while retaining a meaningful
  synthetic staging gate.
- There is no rollback from production to the discarded staging data; the
  staging backup is evidence only and must not contain client data.
- Once live operational use grows, a second staging VPS becomes the preferred
  upgrade rather than weakening the separation rule.
