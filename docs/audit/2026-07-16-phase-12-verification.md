# Phase 12 verification record

**Status:** Technical release-candidate verification passed. Production activation
remains blocked pending client-owned services and acceptance.

## Completed evidence

- clean Phase 12 migration replay;
- eleven PostgreSQL suites and 549 security/behaviour assertions;
- application lint, strict typecheck, and 66 unit tests across sixteen files;
- successful Next.js 16 production build covering all application and API routes;
- production Compose configuration validation;
- CI validation for deployment configuration, workflow JSON, and backup tooling;
- successful production image build and runtime smoke test as the unprivileged
  `nextjs` user;
- live image response verified version `0.12.0`, HSTS, per-request nonce CSP,
  unauthenticated readiness rejection (`401`), and fail-closed synthetic
  readiness (`503`);
- production backup shell syntax and Storage exporter syntax;
- isolated database backup and restore drill with SHA-256 evidence
  `76404b8e7dcf47c4491d325b2b7bff2d9a0fe2a150ebf02bb4ce996f9b7dd998`;
- tutorial isolation from operational notifications and provider deliveries.
- complete tutorial acceptance walkthrough proving the final launch-control step
  stays visible until explicit completion, followed by a safe reset to
  `not_started`.
- readiness authentication verified as `401` without a token and `200 ready`
  with the development token, bounded service-only database function, restore
  evidence, no failed deliveries, and complete required configuration.
- n8n imported all three version-controlled workflows and its audit confirmed
  community packages, public API/playground, templates, telemetry, and risky
  local command/file nodes are disabled; required HTTP Request nodes were reviewed
  against the application-only allowlisted destinations.

## External acceptance still required

- client-owned Supabase Pro project and production domain;
- real Gmail, Telegram, Google, and n8n credential/scoping acceptance;
- off-site encrypted backup destination and scheduled production restore test;
- retention, privacy, malware/quarantine, incident, and account recovery approval;
- primary employee macOS acceptance, training, and launch sign-off.

These are intentionally represented by `/settings/launch` rather than being
reported as complete without evidence.
