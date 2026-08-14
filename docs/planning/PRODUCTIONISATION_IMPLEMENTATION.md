# Productionisation implementation register

**Source:** productionisation, deployment, AI-provider and optional desktop plan  
**Reviewed:** 13 August 2026  
**Rule:** implemented, locally verified and live accepted are distinct claims.

| Stage | State | Evidence / remaining boundary |
| --- | --- | --- |
| 1. Repository audit | Implemented | Existing deployment, AI, Auth, automation, scanning, tests and uncommitted isolation work were reconciled rather than duplicated. |
| 2. Production build | Automatically verified | Next.js standalone output, pinned Node/npm multi-stage image, non-root runtime, read-only Compose and `/api/health/live`; `production:smoke` starts the real image. |
| 3. Environment separation | Automatically verified | Development remains local; staging/production startup validates HTTPS, MFA, proxy trust, Supabase and privileged server configuration. Next.js public Supabase values are built into separate, labelled staging/production images from the same source tag, so cross-environment deployment is rejected. Client/server secret scan passes. |
| 4. Production Compose | Automatically verified | App, n8n, ClamAV and cloudflared use an internal-only network, resource limits, health checks and immutable app image. Mailpit/local Supabase are absent. |
| 5. Managed Supabase | Implemented, external acceptance pending | Versioned migrations, RLS tests, Auth/Storage/Vault architecture and deployment checklist exist. Client-owned project, SMTP, backups/PITR and migration rehearsal require human provisioning. |
| 6. Cloudflare | Implemented as package/runbook | Outbound Tunnel service, Access layering, Ubuntu VPS bootstrap and a secret-free activation handoff are documented and CI-validated. Account, hostname, identity policy and firewall verification require client infrastructure. |
| 7. CI/CD | Implemented, not live accepted | PR CI verifies application/database/browser/operations. Protected manual environment builds publish separately labelled, versioned GHCR images; deployment verifies the exact reviewed source revision, dry-runs migrations, requires backup confirmation, rolls back unhealthy containers and checks private-host invariants. Environment secrets and first deployment remain human actions. |
| 8. AI abstraction | Automatically verified | Deterministic, Ollama and OpenAI implement one analysis, model discovery and connection-health contract. Operational modules call the AI service only. |
| 9. AI settings | Automatically verified | Provider/model/enabled/summary state is per-user; optional OpenAI secret is Vault-backed. Settings never return plaintext credentials. |
| 10. AI security | Automatically verified within hosted boundary | Zod output, evidence, audit metadata and human review remain mandatory. No cloud fallback exists. Hosted Ollama is disabled until a paired local bridge is delivered. |
| 11. AI tests | Automatically verified | Deterministic and mocked Ollama contracts cover structured output, malformed JSON, failure, timeout, models and health. Paid cloud calls are excluded from default CI. |
| 12. Health and launch | Implemented, live acceptance pending | Minimal liveness and authenticated readiness distinguish configuration, database, Storage, scanner, scheduler, queue and backup state. Live checks require deployed providers. |
| 13. Optional Tauri client | Developer-machine test delivered | An unsigned Windows x64, loopback-only Tauri shell and per-user NSIS installer are available for local testing. It is not a standalone, hosted, macOS, signed or client-distribution desktop product. |
| 14. Local Ollama bridge | Deliberately deferred | Development Ollama works. Production selection is blocked until loopback binding, origin restriction and pairing are delivered with the desktop companion. |
| 15. Desktop installer | Deliberately deferred | Windows signing and macOS signing/notarisation, native machines and client approval are required after hosted acceptance. |
| 16. Final production acceptance | External gate | Requires managed Supabase/VPS/Cloudflare, real SMTP and provider staging, backup restore evidence, staff macOS UAT/training and client sign-off. |

## Current executable gates

```text
npm run check
npm run db:test
npm run db:lint
npm run automation:validate
npm run production:validate
npm run security:boundaries
npm run production:smoke
npm run release:verify
```

`release:verify` remains the principal clean-checkout gate. It now includes the
production package, boundary scan and real container smoke test in addition to
the existing install, code, database, backup/restore and cross-browser checks.
