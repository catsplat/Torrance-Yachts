# Project completion register

**Reviewed:** 9 August 2026

**Definition of done:** the hosted internal release is code-complete locally when
all rows in the first table pass. It is live-complete only after the client-owned
activation gates in the final table have recorded evidence in Settings -> Launch.

This register is the definitive answer to "what remains?". A phase number is not
evidence that a provider was connected or that a person accepted the workflow.

## Hosted release: locally complete scope

| Capability | Completion evidence |
| --- | --- |
| Private staff access | Individual Supabase Auth accounts, administrator/staff roles, protected routes, RLS, first-admin setup, session handling and audit history |
| Daily control centre | Responsive dashboard, action queue, notification centre, search/filtering, accessible loading/error states, dark mode and persistent preferences |
| Operational records | Contacts, customers, brokers, captains, yacht responsibilities, notification phone ownership, yachts, enquiries, offers, bookings, tasks and notes |
| Inbox triage | Idempotent Gmail event ingestion, thread/follow-up linking, enquiry/internal/circular/unknown routing, configurable inactivity archival and manual correction |
| AI assistance | Deterministic offline and Ollama/OpenAI adapters, structured validation, evidence, confidence, retry/failure visibility, correction/rejection and mandatory human approval |
| Enquiry reply | Yacht/rate/profile/template context, reviewable suggested summary and draft, Telegram alert content, and approved Gmail draft creation without automatic sending |
| Offer control | Immutable offer snapshots, controlled status transitions and complete history |
| Booking control | Human-confirmed booking command, yacht/date reservation with the required 24-hour buffer, conflict checks, amendment, cancellation and audit trail |
| Booking task engine | Idempotent dependency-aware tasks 0.A-7, reminders/escalations, ad-hoc tasks, dates, notes, completion/reopen controls and blocked-state visibility |
| Documents and finance | Private versioned storage, signed URLs, file validation, required-document checklist, contract fact review, one-to-three instalments, deterministic commission calculation and PDF invoice generation |
| Yachtfolio boundary | Explicit manual update task, evidence and audited completion; no unsupported API claim |
| Calendar | Authoritative internal charter/task calendar and optional external Calendar outbox contract |
| Notifications | Per-user email/phone/Telegram preferences, AI-summary preference, central notification/outbox state, approval queue, retries, permanent failure and recovery visibility |
| Automation | Self-hosted n8n scheduler, development simulator guard, readiness monitor, user-authorised Gmail history reconciliation, and provider-action workers; workflows import inactive and contain no credentials |
| Security and operations | Security headers, server-only secrets, private documents, database lint/tests, dependency audit, health endpoints, backup/export/restore tooling, incident and maintenance runbooks |
| Browser acceptance | Serial Playwright acceptance across Chromium, Firefox and WebKit; protected-route, approved-login, core-workspace, notification, theme, WCAG A/AA and isolated five-route rehearsal coverage; CI retains failure evidence |
| Training and demonstration | Guided tutorial, five-route email rehearsal, and resettable fictional enquiry-to-post-charter rehearsal covering compliance-document quarantine/verification, contract review, instalments, local invoice evidence, Yachtfolio evidence, charter completion and broker follow-up; every external delivery remains simulated and visibly fictional |
| Portfolio and audit | Architecture, decisions, schema notes, phase diaries, changelog, sanitised case studies and acceptance evidence structure |

## Deliberately optional or separate scope

These do not block the hosted v1 because the application already provides the
authoritative function internally.

| Item | Status and decision |
| --- | --- |
| Google Sheets mirror | Application-owned one-way adapter implemented with immutable row IDs, raw formula-safe values, controlled tab replacement and fake-provider coverage. Live acceptance still requires an approved client spreadsheet. PostgreSQL remains authoritative. |
| Google Drive mirror | Application-owned replay-safe adapter and folder picker implemented. Only clean, verified private documents can be copied. Live acceptance still requires an approved protected folder and retention rule. |
| Google Calendar mirror | Application-owned stable-ID private-event adapter implemented with update, create and cancellation behaviour. Live acceptance still requires the client to approve the target calendar. |
| SMS/WhatsApp | Not requested as a launch requirement; phone numbers are retained for routing and a later approved provider. |
| Direct Yachtfolio API | Not available or approved in the brief; the supported launch workflow is an audited human task. |
| Electron/downloadable edition | A separately documented future distribution. The user explicitly prioritised the hosted version; packaging, local update/signing, local backups and macOS/Windows distribution are not part of hosted v1 completion. |
| Public/open-source repository | Repository remains private. Only sanitised generic material may be extracted after company approval. |

## Work that can be completed without the client

1. Keep all application, database and n8n tests passing.
2. Validate every workflow against the pinned n8n version and import it inactive.
3. Validate the production Compose and environment contract without real values.
4. Keep the automated cross-browser acceptance suite passing and complete the
   final physical macOS walkthrough with the client before launch.
5. Keep documentation, changelog and release evidence aligned with the code.

Those items are completed as part of the completion-gap closure milestone. They
must be rerun for the release commit and again after production configuration.

## Minimum client/operator activation gates

The earlier detailed launch checklist is grouped here into the smallest useful
set of decisions and actions. These cannot be fabricated or safely performed by
the developer alone.

1. **Ownership and hosting:** client approves the hosted topology, monthly
   budget, domains, private access method, named system owner and support owner;
   operator provisions the production Supabase project and protected Linux VPS.
2. **Accounts and recovery:** client creates individual staff accounts, chooses
   roles, enables appropriate MFA/recovery, and verifies production account-email
   delivery. Shared-password access is not acceptable for live personal data.
3. **Mailbox:** client/administrator creates the company Google OAuth app, grants
   only the required Gmail scopes, connects the operational mailbox, assigns the
   credential to the three inactive Gmail workflows, then accepts five fictional
   new/follow-up/internal/circular/unknown messages before activation.
4. **Alerts:** client creates/owns the Telegram bot, configures its webhook, and
   each staff member pairs their own chat and confirms one fictional alert. No
   real recipient is contacted before this acceptance.
5. **Business configuration:** client reviews yacht profiles/rates, email and KYC
   templates, staff/captain/broker contacts, invoice issuer/payment details,
   inactivity timeouts, reminder timings, and decides whether any optional
   Calendar/Drive/Sheets mirrors are wanted.
6. **AI and data policy:** client approves the provider, model, data terms,
   permitted fields, spend limit and human-review responsibility. AI remains
   advisory even after activation.
7. **Documents, privacy and recovery:** client approves retention/deletion rules,
   selects a production malware scanning/quarantine boundary before any identity
   document is accepted, confirms privacy responsibilities, commissions encrypted
   off-site database/storage backups and proves a restore.
8. **Acceptance and launch:** the real macOS user completes the tutorial and full
   fictional UAT; monitoring and incident escalation are tested; the client signs
   the launch gate before live emails, identity documents or commercial data enter
   the system.

The application must not be described as live-production complete until all eight
groups have accepted evidence. The developer can prepare every screen, workflow,
script and runbook, but cannot consent to provider scopes, supply private business
data, approve legal policy or sign on the client's behalf.
