# Automation simulator hardening

**Date:** 27 July 2026
**Milestone:** Pre-activation safety hardening

## Outcome

The development n8n delivery simulator is now blocked by the application
outside the explicitly configured development environment. This closes the
last local-assurance acceptance point that required a technical guard rather
than an operator instruction.

## Implementation

1. Defined the simulator's stable worker identity in the server-only automation
   authentication module.
2. Applied the environment check after request authentication and schema
   validation at claim, completion, and failure routes.
3. Added unit coverage for development, staging, production, and normal
   provider-worker paths.
4. Recorded the defence-in-depth decision and updated the n8n operator guide
   and launch-gap register.

## Scope boundary

This does not activate n8n, Gmail, Telegram, or any external provider. It only
makes the existing fictional simulator safer to use while local acceptance is
being completed.

## Verification

- Application unit suite: 92 passed, 1 environment-dependent local Ollama check
  skipped.
- ESLint, TypeScript, and the Next.js production build: passed.
- PostgreSQL lint: passed with no warnings.
- PostgreSQL permission and behaviour suite: 623 passed.
