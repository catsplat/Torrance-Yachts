# ADR 0039: Environment-specific release images

**Status:** Accepted
**Date:** 13 August 2026

## Context

The hosted service uses Next.js. Its `NEXT_PUBLIC_*` values are compiled into
the browser bundle at build time, including the browser-safe Supabase URL and
publishable key. A single image built for staging must therefore never be
deployed to production, or vice versa: it could point a user-facing client at
the wrong Supabase project even when the server-only environment is correct.

The service still needs repeatable source provenance and an immutable deployed
artefact. PostgreSQL/Supabase remains the operational authority; the image only
contains application code and browser-safe configuration.

## Decision

- A semantic source tag, such as `v0.19.1`, identifies the reviewed commit.
- The **Build approved environment image** workflow is manually dispatched for
  either `staging` or `production`. It checks out that exact tag and uses only
  the selected GitHub environment's browser-safe Supabase variables.
- It publishes separate immutable release tags:
  `staging-v0.19.1` or `production-v0.19.1`, plus a source-SHA tag. Image
  labels record the source revision, source tag and intended environment.
- The deployment workflow accepts only the matching environment-prefixed
  semantic tag. On the VPS, `deploy-release.sh` verifies the image labels,
  resolves the tag to its content digest and stores that digest in `.env`
  before starting Compose.
- A release tag is source evidence, not permission to promote an image. Staging
  must pass synthetic acceptance before a production image is built from the
  same source tag.

## Consequences

- Staging and production are reproducible from identical reviewed source, but
  intentionally have separate image artefacts because their browser-safe
  endpoints differ.
- Secrets, service-role keys and private configuration remain runtime-only and
  never enter the image build or repository.
- A production rollout can roll back to a prior accepted immutable digest. It
  must still review database compatibility before reversing an application
  deployment.
- Operators have one extra deliberate build step per environment, preventing an
  accidental cross-environment promotion.
