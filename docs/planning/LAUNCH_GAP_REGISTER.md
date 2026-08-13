# Launch gap register

**Status:** v0.19.1 pre-deployment verification in progress
**Last reviewed:** 13 August 2026

## Evidence states

| State | Meaning |
| --- | --- |
| Implemented | Code and migrations exist. |
| Automatically verified | Repeatable unit, database, browser or contract proof passes. |
| Locally accepted | A person completed the fictional workflow on the intended local build. |
| Client accepted | Torrance approved the policy, values and operating method. |
| Live accepted | The client-owned provider path passed staged synthetic acceptance. |

## Pre-deployment position

| Area | Current evidence | Remaining non-code gate |
| --- | --- | --- |
| Operational registers | Cursor contracts, exact counts, URL state and 10,000-record tests | Client UAT with approved imported configuration |
| Access and MFA | Approved-user guard, AAL2, role separation, reset audit and unapproved isolation | Approve real identities and recovery owner |
| Gmail and AI | One application-owned OAuth path, history reconciliation, leased queue and fictional five-route proof | Client OAuth consent, provider/data-policy approval |
| Booking workflow | Full fictional enquiry-to-follow-up UI path and database edge cases | Staff macOS walkthrough |
| Documents | Private quarantine/release, ClamAV boundary, retry/reject/reconcile and blocked access | Retention policy and production scanner acceptance |
| Alerts and mirrors | Fake-provider contracts, retry/back-off and reconciliation | Recipient and destination ownership acceptance |
| Recovery | Disposable database restore drill and runbooks | Encrypted off-site schedule and production restore drill |
| Deployment | Standalone image, hardened Compose, startup validation, separately labelled staging/production GHCR images, protected deployment/rollback workflow and local container smoke proof | Provisioning, private ingress, managed-Supabase migration rehearsal, monitoring and provider acceptance |

## Deliberate pre-deployment exclusions

- no hosting, domain, Cloudflare activation or internet-facing service;
- no live mailbox, Telegram recipient, cloud AI request or provider credential;
- no client identity document, private contact, bank detail or current commercial term;
- no claim of provider success based on a fake response;
- no Windows/macOS desktop packaging or signing.

When `npm run release:verify` passes from the clean v0.19.1 commit, the shared
application is ready to bake. All remaining work is client-owned configuration,
provider acceptance, training/UAT, infrastructure and packaging.
