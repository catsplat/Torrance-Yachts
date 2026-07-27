# 0021: Reject the local n8n simulator outside development

**Date:** 27 July 2026
**Status:** Accepted

## Context

The local n8n delivery simulator deliberately completes leased deliveries
without contacting a provider. It exists to exercise the outbox contract with
fictional data, but an inactive workflow definition alone is not a sufficient
production safeguard: an operator could accidentally import or enable it in a
non-development n8n instance.

## Decision

The simulator uses the fixed worker identifier `n8n-development-simulator`.
The application rejects its claim, completion, and failure requests unless
`APP_ENVIRONMENT=development`. Normal named provider adapters retain the
authenticated claim/result contract.

## Consequences

- A simulator import cannot silently complete provider work in staging or
  production, even if it has the shared automation secret.
- n8n configurations must still keep simulator workflows inactive and out of
  production. The API guard is defence in depth, not the only control.
- Local acceptance remains possible with fictional records and no provider
  credential.
