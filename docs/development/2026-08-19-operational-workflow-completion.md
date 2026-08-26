# 2026-08-19 — Operational workflow completion

Implemented additive foundations for the final operational workflow:

- scanner-safe, cross-device manual invitation/recovery handoffs;
- provider-neutral private mailbox ingestion with TLS IMAP support;
- earlier enquiry availability review with no reservation side effect;
- unified enquiry/booking task creation with database-enforced readiness;
- cancellation acknowledgement task while retaining the historic workflow.
- paired, outbound-only local-Ollama helper registration with owner revocation.
- protected Configuration Pack preview/import for runtime yacht, rates, draft
  wording, sales material and booking-workflow setup.

Follow-up corrections found by the acceptance suite:

- manual-link audit records now use the shared `insert`/`update` audit contract;
- task readiness is refreshed when any upstream task changes, including an
  enquiry-only task chain.

Validation: 39 database files / 993 assertions, 149 Vitest assertions (three
documented skips), lint, strict TypeScript, schema lint, documentation checks,
and a production Next.js build passed locally. No existing operational records
were reset or deleted.
