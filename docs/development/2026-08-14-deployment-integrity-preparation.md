# Deployment integrity preparation

**Date:** 14 August 2026
**Milestone:** Pre-hosting reliability work

## Why this was added

The first hosted staging deployment will be a consequential operational action.
Before it is attempted, the release path needs more than a version string and a
container liveness check. This change keeps deployment tied to the reviewed
source revision and verifies the target's private-runtime boundary after Docker
starts the package.

## Implemented

- deployment now compares OCI environment, release and source-revision labels
  against the checked-out semantic tag;
- the VPS records both the immutable image digest and reviewed source revision;
- a non-secret runtime verifier checks `.env` permissions, internal-only service
  ports, expected services, immutable image identity and internal health;
- production-package validation asserts that these contracts remain present;
- all GitHub Action dependencies are pinned to immutable reviewed commits, with
  a release contract that rejects mutable action references;
- n8n, ClamAV and Cloudflare Tunnel are pinned to reviewed registry digests so
  supporting runtime containers cannot drift beneath the application release;
- routine local Supabase startup no longer prints local connection values into
  terminals or captured logs.

## Boundary retained

This does not deploy anything, create provider accounts, expose a service or use
client data. Staging remains blocked only on client-controlled environment
variables, secrets, lean self-hosted Supabase runtime configuration and VPS
configuration.
