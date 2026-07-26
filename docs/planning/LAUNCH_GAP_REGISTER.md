# Launch gap register and offline assurance plan

**Status:** Local code-and-database assurance complete; external activation pending
**Last reviewed:** 26 July 2026
**Scope:** Finish and prove the product locally before any hosting, live client
data, or external provider credential is introduced.

## Purpose

The twelve delivery phases established the application, database boundaries,
workflow model, and release-candidate deployment material. They do not prove
that a real staff member can safely operate the full workflow with their own
mailbox, credentials, documents, and production infrastructure.

This register separates three materially different states:

| State | Meaning |
| --- | --- |
| Implemented | The application and database behaviour exist and have automated coverage. |
| Locally rehearsable | The exact internal boundary can be exercised with fictional data and simulated providers. |
| Live accepted | A client-owned provider/infrastructure path has passed controlled acceptance with evidence. |

No item moves directly from implemented to live accepted without a local
rehearsal, a staged external test, and recorded human acceptance.

## Confirmed implementation and activation gaps

| Area | Current state | Local completion work | Live acceptance work |
| --- | --- | --- | --- |
| Enquiries, offers, bookings, buffered availability, tasks, payments | Implemented and database-tested | Fictional M/Y Asteria rehearsal map and normal/conflict/cancelled/amended/dependency tests are available locally. | Import approved business data and complete staff UAT. |
| Email intake | Gmail payload validation and durable ingestion exist. | Completed: five fictional routes use the same ingestion command; replay/idempotency is covered by app and database tests. | Connect client-owned Gmail/n8n credentials and run a scoped acceptance set. |
| AI | Deterministic provider and OpenAI adapter existed; local Ollama adapter is added for offline assurance. | Completed locally: valid response, malformed response, unavailable provider, timeout, evidence, correction/rejection, and human approval boundaries are covered. | Approve provider, data policy, model, spend limits, and service account. |
| Notifications and provider deliveries | Outbox, retry, failure visibility, and development delivery simulator exist. | Completed: loopback success contract plus database coverage for leases, transient/permanent failure, retry/backoff, and recovery. | Configure Telegram/Google/SMTP, verify recipient ownership and scopes. |
| Documents and contract review | Private storage, document requirements, reviewed facts, payments, and invoice generation exist. | Use only fictional PDFs/text; exercise rejected type, verification, missing-document, and reviewed-contract cases. | Approve malware/quarantine treatment, retention policy, and production Storage access. |
| Calendar, Drive, Sheets | Versioned adapters/outbox contracts exist. | Test snapshot/idempotency and simulated delivery completion locally. | Configure client-owned Calendar, protected Drive folder, Sheet and OAuth/service-account scopes. |
| Yachtfolio | Audited manual boundary is implemented. | Confirm the task/evidence/reopen flow in the rehearsal. | Train the named user; do not claim an unsupported API integration. |
| Deployment, backup, monitoring | Release-candidate Compose/runbooks exist. | Completed: clean build, 610 database tests, database lint, local restore drill, loopback health, and production dependency audit. | Provision staging/production, off-site backup, monitoring, private ingress, restore drill. |

## Local completion sequence

### L1 — Offline email and AI rehearsal

**Outcome:** A fictional email enters the actual Inbox through the production
validation and database-ingestion boundary. A locally installed Ollama model
creates a schema-validated proposal; a human reviews it before any authoritative
record changes.

**Acceptance checks:**

1. New enquiry, follow-up, internal, circular, and unknown fixtures appear in
   the Inbox with the intended deterministic classification/review state.
2. Replaying an identical provider event creates no duplicate message or work.
3. Invalid payloads are rejected before persistence.
4. Local Ollama output is validated, source evidence is checked, and malformed
   output is retained as a visible failure rather than applied.
5. A reviewer can correct/reject output and manually create/associate an
   enquiry.

### L2 — Synthetic charter rehearsal

**Outcome:** A fictional enquiry is manually progressed through a reviewable
offer, signed-contract review, confirmed booking, task generation, payments,
availability buffer, document checklist, and Yachtfolio task.

**Acceptance checks:**

1. No unapproved AI output can create a booking, send a message, or reserve a
   yacht.
2. One confirmed booking creates the supplied dependency-aware task workflow
   once only.
3. Booking conflict, cancellation, date amendment, missing-document, and
   overdue-payment paths remain understandable and auditable.
4. The simulated charter start/end and broker follow-up occur only at the
   configured dates/offsets.

### L3 — Offline provider simulation

**Outcome:** n8n's local development simulator consumes only synthetic outbox
deliveries and records success/failure using the same claim/complete/fail
contract as live providers.

**Acceptance checks:**

1. Worker leases prevent duplicate delivery.
2. Transient failures back off and retry; permanent failures remain visible.
3. A staff member can identify the record, recipient class, failure reason, and
   safe recovery action without reading logs.
4. No development simulator can run in a production environment.

### L4 — Local operational acceptance

**Outcome:** The primary user completes the full fictional workflow on their
normal browser without developer intervention.

**Acceptance checks:**

1. The dashboard guides the day’s work without relying on a separate sheet.
2. The guided tutorial and rehearsal instructions agree with the live interface.
3. A backup/restore drill and incident walkthrough can be followed from the
   runbooks.
4. All tests, database tests, production build, linting, and dependency audit
   pass from a clean local start.

## Later live activation gates

These are deliberately not local tasks and should not be attempted until L1–L4
are accepted:

1. Client confirms hosted topology, owner accounts, ongoing budget, and private
   access approach.
2. Staging Supabase, VPS, n8n, secret storage, encrypted off-site backups, and
   monitoring are commissioned.
3. Provider-by-provider synthetic acceptance is recorded: Gmail, Telegram,
   Calendar, Drive, Sheets, SMTP, then optional AI.
4. Retention, document scanning/quarantine, incident response, account recovery,
   and data-entry policy are approved in writing.
5. A named employee completes UAT and signs the launch gate.

## Deliberate non-goals for local assurance

- no real mailbox, Telegram chat, cloud AI request, client contact, passport,
  KYC file, commercial term, or payment instruction;
- no hosted domain or internet-facing service;
- no claim of live provider success based on a simulated response;
- no direct Yachtfolio automation without a supported, approved API.
