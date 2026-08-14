# ADR 0042: Credential-free hosted activation preparation

**Status:** Accepted
**Date:** 2026-08-14

## Context

The application is ready to progress from local acceptance to a client-owned,
private hosted service. Deployment must not depend on a developer manually
remembering system configuration or transmitting credentials in chat. At the same
time, a VPS login cannot legitimately replace ownership of the database, domain,
private ingress, account email, Google consent or Telegram bot.

## Decision

Ship an idempotent Ubuntu-only VPS bootstrap that prepares Docker and the protected
deployment directory but creates no service configuration or credentials. Maintain
a version-controlled activation handoff that maps each required provider-owned
value to the correct secret store. Validate both artefacts in CI and the local
release gate.

The application continues to deploy only immutable, environment-labelled container
images through GitHub Environments. Staging must be accepted before production.
Runtime secrets are written only to the VPS-owned `.env` file with `600` mode;
browser-safe Supabase values are GitHub Environment variables compiled separately
for staging and production.

## Consequences

- The first live activation needs client-owned provider configuration in addition
  to a VPS SSH account; this is an ownership and security requirement, not a
  software gap.
- The deployer never needs to build source code on the VPS, copy a database dump,
  expose an internal port or add provider credentials to n8n.
- The bootstrap is deliberately limited to Ubuntu. Supporting another Linux
  distribution requires a separately reviewed implementation rather than a
  best-effort package-manager branch.
- Live provider consent, Cloudflare policy, Supabase backup/PITR, SMTP delivery,
  staff training and launch sign-off remain external acceptance steps.
