# Hosted pilot operability — 14 August 2026

## Purpose

Tighten the hosted-pilot path before the domain and provider accounts are active.
No provider credential, business record, document, or external message was used.

## Changes

- Corrected hosted automation status: production and staging use the
  application-owned worker, while n8n remains optional and local-only for
  development rehearsal.
- Added a small, tested activation-state rule so a hosted deployment is not
  incorrectly presented as needing an n8n endpoint.
- Added a guarded systemd backup service/timer template and installer for the
  CX23. It requires encryption/off-site settings first, runs as the non-root
  deployment account, prevents overlap, and starts only after activation.
- Added encrypted-backup success evidence and a non-decrypting freshness/checksum
  verifier.

## Verification

- targeted readiness tests, lint, and strict TypeScript checks pass locally;
- production package validation covers backup-script syntax, timer hardening and
  deployment-package delivery;
- the timer is deliberately not enabled on the currently idle VPS because no
  production backup destination or real application stack exists yet.
