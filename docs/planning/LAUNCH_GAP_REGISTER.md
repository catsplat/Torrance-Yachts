# Launch gap register

**Status:** release-ready codebase; hosted activation pending
**Last reviewed:** 14 August 2026

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
| Gmail and AI | Per-user Google OAuth and IMAP paths, private owner-aware ingestion, leased queue, paired-Mac Ollama option and fictional five-route proof | Client mailbox consent and data-policy approval |
| Booking workflow | Full fictional enquiry-to-follow-up UI path and database edge cases | Staff macOS walkthrough |
| Documents | Private quarantine/release, ClamAV boundary, retry/reject/reconcile and blocked access | Retention policy and production scanner acceptance |
| Alerts and mirrors | Telegram bot pairing, fake-provider contracts, retry/back-off and reconciliation | Company bot ownership and recipient acceptance |
| Recovery | Disposable database restore drill and runbooks | Encrypted off-site schedule and production restore drill |
| Deployment | Standalone image, hardened Compose, lean CX23 self-hosted Supabase profile, startup validation, separately labelled staging/production GHCR images, protected deployment/rollback workflow and local container smoke proof | Complete private ingress, runtime secrets, backup destination, monitoring and staged provider acceptance |

## Deliberate pre-deployment exclusions

- no active internet-facing application or connected production providers;
- no live mailbox, Telegram recipient, cloud AI request or provider credential;
- no client identity document, private contact, bank detail or current commercial term;
- no claim of provider success based on a fake response;
- no signed or client-distributed Windows/macOS desktop package.

`npm run release:verify` is the clean-checkout release gate. With the release
evidence passing, the shared application is ready for hosted activation. The
remaining work is controlled environment configuration, provider acceptance,
training/UAT and launch sign-off.
