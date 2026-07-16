# Torrance Yachts Charter Operations Platform

## Project brief and source of truth

**Status:** All twelve implementation phases plus `v0.13.0` workflow hardening complete; production activation pending client acceptance

**Owner/developer:** Thom, working with Codex

**Primary organisation:** Torrance Yachts

**Last reviewed:** 16 July 2026

This document translates the original project context into a stable, version-controlled brief. It defines what the project is intended to achieve and should be consulted before architecture, implementation, or scope decisions are made.

Live client data, identity documents, personal bank details, private contact details, API credentials, and current commercial terms must never be committed to this repository. Those values belong in protected production data or secret configuration.

## 1. Purpose

Build a reliable internal charter-operations platform that reduces the manual work and risk involved in taking a yacht-charter booking from the first enquiry email through offers, contracting, compliance, payment reminders, booking operations, charter commencement, charter completion, and broker follow-up.

The product is not a public yacht-booking marketplace. It is a private operational control centre for Torrance Yachts staff.

The project is successful when the full workflow described in this brief can be run reliably in the system, with clear human control, no missed operational tasks, secure document handling, an auditable history, and useful notifications.

## 2. Users and operating context

- The primary user is the employee who currently manages this workflow manually.
- The likely initial deployment has one active user.
- The design must comfortably support four or five internal users without organisational multi-tenancy.
- The developer is relatively new to large web applications and is most experienced with Python.
- Development should minimise custom code by composing proven services and using AI-assisted implementation, while keeping business rules understandable and tested.
- Development takes place on Windows. The principal user will access the finished product from macOS through a web browser.
- A desktop wrapper such as Electron is optional and must not be part of the initial critical path.

## 3. Delivery constraints

- Baseline at project inception: planning only, with no application code or required services set up. The current implemented state is tracked in `README.md`, `CHANGELOG.md`, and `docs/planning/DELIVERY_PHASES.md`.
- Desired delivery: as soon as possible, with an aspirational one-month target.
- The architecture must account for the whole workflow from the beginning, but implementation will use dependency-aware vertical slices so each milestone works end to end.
- Simplicity, reliability, maintainability, and recoverability take priority over scale.
- Target operating cost is approximately £20 per month, with justified flexibility.
- Earlier estimates place the complete first production release at roughly 400–500 learning-and-development hours. The one-month target is therefore a schedule risk and must not be met by removing security, testing, backups, or essential workflow controls.

## 4. Product principles

### 4.1 One operational source of truth

PostgreSQL is the authoritative store for customers, contacts, yachts, enquiries, email threads, offers, bookings, availability, tasks, documents, notifications, payments, workflow events, and audit history.

Google Sheets may provide a familiar editable/reporting view or controlled import/export, but automations must not depend on a spreadsheet as the authoritative database. Conflicts must resolve in favour of the platform unless an explicit, audited import operation says otherwise.

### 4.2 Explicit state machines

Enquiries and bookings must progress through controlled states rather than arbitrary status text. Transitions must be validated, recorded, and capable of triggering workflow events.

Proposed enquiry lifecycle:

1. New
2. Waiting for reply
3. Offer sent
4. Negotiating
5. Contract issued
6. Awaiting signatures
7. Booked
8. Charter active
9. Completed
10. Archived

Additional internal classification states may exist for follow-ups, rejected enquiries, cancellations, and manual review, but must not obscure the main operational lifecycle.

### 4.3 Event-driven workflow

Important changes create durable events such as `EmailReceived`, `EnquiryCreated`, `OfferSent`, `ContractSigned`, `BookingConfirmed`, `PaymentDue`, `CharterStarted`, and `CharterEnded`.

Automations respond to these events in small, independently testable workflows. Reprocessing must be idempotent: retrying an event must not create duplicate bookings, tasks, notifications, invoices, or calendar events.

### 4.4 Configurable task templates

Booking tasks and dependencies are data-driven templates, not scattered `if` statements. Templates must support:

- creation triggers;
- dependencies on prior task completion;
- dates extracted from a contract;
- offsets from charter or payment dates;
- required and optional tasks;
- assignees;
- reminders and escalation;
- notes and manual edits;
- an audit trail of completion and reopening.

### 4.5 Central notification service

All Telegram, email, and possible future SMS/WhatsApp notifications pass through one notification service with recipient, channel, priority, status, retry count, and sent time. A yacht can have its own operational phone/contact so notifications can be routed to the person responsible for that yacht.

### 4.6 AI assists; humans decide

AI may classify, extract, summarise, draft, and suggest. It must not independently:

- send consequential emails;
- confirm a booking;
- block yacht dates;
- change a material workflow state;
- upload or disclose identity documents;
- issue an invoice;
- update Yachtfolio;
- notify an external captain or broker.

Material actions require a human review-and-approve step. Every AI result includes confidence, source references, validation, and an obvious route to manual correction.

## 5. Recommended technical direction

These are the current architectural defaults, not permission to create paid services without approval.

- **Application:** Next.js App Router with TypeScript.
- **UI:** Tailwind CSS and shadcn/ui.
- **Database:** Supabase PostgreSQL.
- **Authentication:** Supabase Auth, initially with individual local/email accounts. A single shared password is less desirable because it weakens auditability.
- **File storage:** private Supabase Storage buckets with short-lived signed access URLs.
- **Automation:** n8n, initially local during development and later hosted if selected.
- **AI:** a provider-neutral application interface, with OpenAI the likely first provider and Anthropic or local Ollama possible later.
- **Primary integrations:** Gmail, Telegram, Google Drive, Google Calendar, and controlled Google Sheets synchronisation.
- **External operational system:** Yachtfolio. The initial integration is a human task and confirmation because no safe supported API has yet been established.
- **Production hosting:** selected as managed Supabase Pro plus a protected Linux VPS running the standalone Next.js application, local n8n Community Edition, and Caddy. Production purchase and activation remain subject to client approval. The fully local desktop package remains a separately documented future distribution.

Make.com may be used as a reference or prototype because an existing shared scenario was supplied, but it is not the intended core source of workflow logic. Logic essential to correctness must be represented in application code, database rules, or version-controlled n8n definitions.

## 6. Required product areas

### 6.1 Authentication and user management

- Private access only.
- Login, logout, session expiry, password recovery, and protected routes.
- Small internal user list with name, email, phone, Telegram identity, active status, and role.
- Initially simple roles such as administrator and staff.
- No enterprise SSO, organisation tenancy, public registration, or customer portal.

### 6.2 Dashboard

The dashboard is the internal control centre and should answer operational questions rather than merely display decorative charts:

- open and ageing enquiries;
- replies or approvals waiting for action;
- today's and overdue tasks;
- upcoming charters;
- payment instalments due;
- unread or unclassified emails;
- missing booking documents;
- recent activity and automation failures.

### 6.3 Contacts and customers

Maintain customers, charterers, brokers, captains, crew/operations contacts, companies, email addresses, phone numbers, notes, and communication history. Contacts can play more than one role and must be linked to enquiries, bookings, yachts, and email threads without duplication.

### 6.4 Yachts

Maintain yacht identity, specifications, availability, commercial profile, seasonal rates, preferred ports, operational notes, document links, captain details, notification recipients, and active status.

BOJI is the first supplied working example. Its offer material includes:

- seasonal weekly rates and tax rules;
- the less-than-one-week rate calculation;
- preferred and negotiable embarkation/disembarkation ports;
- fuel consumption and cruising-speed guidance;
- brochure, crew profile, and sample-menu links;
- specifications, features, broker references, and written references.

These values must be editable business data, never hard-coded in UI or prompts. Current prices, named references, and contact details must be entered securely at deployment rather than copied into the public codebase.

### 6.5 Email ingestion and classification

The initial email route is an operational mailbox/Gmail connection. Each message is stored or referenced with its provider ID, thread ID, sender, recipients, timestamps, subject, safe body representation, attachments, and processing status.

Incoming mail is classified into:

1. **New enquiry:** extract structured details, suggest or create a reviewable enquiry, draft the appropriate yacht reply, and notify Telegram for human approval.
2. **Enquiry follow-up:** associate with the existing email thread/enquiry and notify with sender and summary.
3. **Internal email:** notify the internal user with sender and summary.
4. **Circular/newsletter:** mark read and archive or route to a designated mailbox according to an approved deterministic rule.
5. **Unrecognised/low confidence:** create a manual-review item and notification.

The system must prevent duplicate processing when Gmail or n8n retries a message.

Pre-contract enquiries that receive no recorded activity must be archived after
administrator-configured timeouts so low-conversion dead ends do not clutter normal
operational views. Archival preserves the full record and is reversible through an
audited lifecycle action; it never deletes the enquiry.

### 6.6 Enquiries and offers

- Create enquiries manually or from approved email extraction.
- Link the contact, broker/company, requested yacht, dates, guests, ports, budget, source email, summary, notes, priority, owner, and full conversation.
- Distinguish new enquiries from follow-ups.
- Detect date conflicts against booking availability, including the required 24-hour buffer on each side.
- Generate a reviewable reply from the yacht-specific offer template.
- Move an enquiry to offer status when an offer is prepared/sent.
- Store a history of proposed terms, sent offers, replies, and status changes.

The supplied BOJI reply is a business template, not static application text. Its greeting, rate, VAT, port comments, specifications, features, supporting links, references, and closing must be assembled from versioned template content and current yacht data. A human approves the final draft before sending.

### 6.7 Booking and availability

A booking is created only after a human confirms that the charter agreement is signed by all required parties. Contract-derived details must be reviewed before confirmation.

On confirmation:

- create the booking and link it to the originating enquiry/offer;
- reserve the yacht from 24 hours before charter start until 24 hours after charter end for availability checking;
- create the booking workflow tasks from the applicable template;
- create document requirements;
- create the reviewed payment schedule;
- create relevant reminders and calendar entries;
- notify the appropriate internal users;
- create a specific task for Kylian to add the booked dates and update status in Yachtfolio;
- never treat manual Yachtfolio work as complete until the user explicitly checks it off.

Availability is calculated from booking/reservation records. It must not be maintained as an unrelated manually edited yacht field.

### 6.8 Booking task sequence

The first workflow template must represent the supplied sequence and dependencies:

| Ref | Task | Trigger/dependency |
| --- | --- | --- |
| 0.0 | Start booking task sequence | Human-approved recognition of fully signed charter contract and reviewed contract details |
| 0.A | Request the broker's KYC statement and client's passport; prepare draft and reminders | Immediately when sequence starts |
| 0.B | Upload/record KYC, passport, and CDD passport-check file | After 0.A is completed |
| 1.A | Kylian uploads the fully signed contract to the protected document store/approved Google Drive location | After 0.B is completed |
| 1.B | Extract and review important signed-contract data for the database and optional Sheet view | After 1.A is completed |
| 1.C | Generate Kylian's 2% commission invoice PDF for Fengus and send the draft to Telegram for review | After 1.A is completed |
| 1.D | Upload/record Kylian's invoice | After 1.C is completed |
| 1.E | Notify Kylian to mark the yacht Booked and add the booked dates in Yachtfolio | After 1.A is completed |
| 2.A | Draft the yacht captain's contact details to the broker | After 1.A is completed |
| 2.B | Notify the captain of the booking through the configured notification route | After 2.A is completed |
| 3 | First instalment reminder with broker email, dates, yacht, amount, and due date | Contract data reviewed in 1.B |
| 4.A | Second instalment reminder with the same operational context | Contract data reviewed in 1.B |
| 4.B | Optional third instalment reminder | Only if present in the reviewed contract data |
| 5 | Charter-start notification and booking status update | Reviewed charter start date |
| 6 | Charter-end notification and booking status update | Reviewed charter end date |
| 7 | Broker reference follow-up and broker commission-invoice upload | Due two days after charter end |

Users must be able to tick tasks, reopen them, add/delete permitted ad-hoc tasks, change dates with a recorded reason, attach notes, and see which later tasks are waiting on a dependency.

The supplied KYC request wording and invoice wording must become secure, editable, versioned business templates with placeholders. Real client identity details, personal bank details, and named private recipients must be configured outside source control.

### 6.9 Documents

Required booking-document checklist:

- charter agreement signed by all parties;
- broker KYC statement;
- client passport;
- CDD/passport check file;
- Kylian commission invoice;
- broker commission invoice where applicable.

Documents must have type, owner entity, booking, version, upload time, uploader, verification status, retention classification, and audit history. Identity documents, KYC/CDD records, contracts, and invoices are private by default.

Public links may be created only deliberately for approved non-sensitive sales materials. They must be revocable and preferably expiring. Identity documents must never use public links.

### 6.10 Contract data and payments

Contract extraction should propose, at minimum:

- yacht;
- charterer and broker/company;
- charter start/end date and ports;
- charter fee and currency;
- tax and other material charges;
- instalment count, due dates, and amounts;
- commission rate/amount;
- signature/completion state.

The user compares extracted fields with the signed document and approves them. Calculations such as the 2% commission must be deterministic code with tests, not AI arithmetic.

### 6.11 Tasks and calendar

- Unified task list, checklist view, due dates, priorities, assignees, notes, completion, overdue state, filters, and search.
- Task dependencies and scheduled reminders.
- Calendar view inside the application.
- Optional Google Calendar synchronisation with durable external IDs and duplicate protection.
- Dates remain traceable to their source: contract field, task template, manual override, or calendar sync.

### 6.12 Notifications

- Telegram is the first notification and approval channel.
- Relevant notifications include new-enquiry drafts, non-circular email summaries, internal-email summaries, unknown-email alerts, missing action reminders, payment reminders, captain notifications, charter start/end notifications, and integration failures.
- The recipient may be a user, yacht-specific contact, captain, broker, or configured group.
- Phone numbers are stored for future SMS/WhatsApp support, including one operational number per yacht where required.
- Notification delivery failures are visible and retryable.

### 6.13 Google Sheets

A Sheet can present enquiry/offer/booking tracking and contact information in a familiar format. It should look professional and be useful to staff, but its role is a controlled view/synchronisation target rather than the operational database.

The captain-contact source required for task 2.A should ultimately be the yacht/contact records in PostgreSQL. A Sheet may be imported initially or kept as a synchronised view.

### 6.14 Search, filtering, and activity history

- Search across contacts, yachts, enquiries, bookings, tasks, and permitted document metadata.
- Filters for state, date, yacht, assignee, overdue status, missing documents, and payment status.
- An append-only audit view showing who or what changed each important value, from which prior value, at what time, and with which originating event.

### 6.15 Guided tutorial and synthetic practice mode

After the complete operational workflow is implemented, Settings must offer a guided
tutorial that explains the application in the context of the client's actual working
process rather than as a generic feature tour.

The tutorial must:

- explain each module and the hand-off between email, enquiry, offer, booking,
  tasks, documents, payments, charter operations, and broker follow-up;
- highlight the relevant controls in the real interface with clear next/previous,
  pause, restart, and exit actions;
- include a completely synthetic practice scenario beginning with a fake enquiry
  email and continuing through the full enquiry-to-post-charter workflow;
- explain when AI is suggesting work and when a human approval is required;
- make clear which external actions remain manual or are performed by integrations;
- remain isolated from live operational records, documents, notifications, provider
  actions, and external systems;
- allow the tutorial state and synthetic practice records to be reset safely.

This is a Phase 12 launch-readiness feature. It must not be implemented before the
underlying workflow and interfaces are stable, because premature tutorial content
would become inaccurate as the product changes.

## 7. Core domain records

The detailed database schema will be designed separately, but it must cover:

- users and roles;
- contacts, companies, and contact roles;
- yachts and yacht notification contacts;
- yacht commercial profiles and response templates;
- enquiries, offers, notes, and status history;
- email messages, threads, attachments, classifications, and processing attempts;
- bookings, reservations, charter periods, and availability buffers;
- payment schedules and payment state;
- documents, document requirements, versions, and access grants;
- task templates, template steps, task dependencies, generated tasks, notes, and reminders;
- workflow events and processing attempts;
- notifications and deliveries;
- calendar events and external integration identifiers;
- audit log;
- integration connections and synchronisation state without storing raw secrets in tables unnecessarily.

## 8. Security, privacy, and reliability requirements

- The application must not be publicly usable. Unauthenticated routes expose no operational data.
- Use individual accounts unless a reviewed deployment constraint makes that impossible.
- Enforce authorisation at the database layer with Supabase Row Level Security as well as protected application routes.
- Use least-privilege service accounts and integration scopes.
- Keep all credentials in environment/secret storage; provide only redacted `.env.example` names in Git.
- Validate all input on the server and treat email/document content as untrusted.
- Apply upload size/type rules, safe filenames, and malware scanning or quarantine before sensitive files are made available.
- Prevent cross-site scripting, injection, request forgery, broken access control, insecure direct object references, rate abuse, and accidental secret exposure.
- Redact sensitive content from logs, AI traces, analytics, screenshots, and error reporting.
- Do not use real passports, KYC files, contracts, or client messages in development/test environments.
- Ensure AI-provider settings do not expose sensitive documents or messages beyond the approved data policy.
- Record security-relevant and business-relevant changes in an audit log.
- Provide automated database backups, protected file backups/versioning, restoration instructions, and periodic restore tests.
- Monitor application health, automation failures, notification failures, backup status, and expiring integration credentials.
- Design graceful fallbacks so email, AI, Telegram, Calendar, Sheets, or Yachtfolio failures do not corrupt the core booking record.
- Define retention and deletion procedures for identity/KYC data before production use.

## 9. Environments and deployment

At minimum:

1. **Local development:** Windows, fake/test data, local Next.js, safe development integrations.
2. **Production:** browser-accessible from macOS, HTTPS, access-controlled, backed up, monitored, and able to run scheduled/background work without an employee laptop remaining on.

A staging environment is desirable before live email or real client documents are connected. Hosting must be selected only after a costed comparison of a small Linux VPS, managed Supabase, Vercel/managed frontend, and backup/monitoring needs.

## 10. Testing and acceptance

Every vertical slice requires:

- type checking and linting;
- automated tests for business rules;
- integration tests for database and external-service boundaries;
- permission tests for protected records and documents;
- retry/idempotency tests for event and n8n workflows;
- manual browser verification on Windows and macOS;
- documented acceptance criteria and evidence;
- rollback and recovery consideration.

Critical end-to-end acceptance scenario:

1. Receive a representative new enquiry email.
2. Classify and extract it with visible confidence and sources.
3. Review and approve the created enquiry and yacht-specific draft.
4. Progress through offer and contract states.
5. Upload and verify the signed contract and compliance documents.
6. Confirm the booking and block buffered yacht dates.
7. Generate the exact dependent task sequence, payment reminders, document checklist, and calendar records without duplicates.
8. Complete the Yachtfolio and captain/broker actions with recorded confirmations.
9. Start and finish the charter at the correct dates.
10. Produce the broker follow-up and commission-document task two days later.
11. Demonstrate audit history, notification delivery, backup, and recovery for the scenario.

## 11. Documentation and portfolio requirements

The private GitHub repository should contain:

- a professional README;
- architecture and data-flow diagrams;
- database documentation and migrations;
- architectural decision records;
- API/integration contracts;
- security and privacy notes without live secrets;
- testing strategy and acceptance evidence;
- deployment, backup, restore, incident, and maintenance runbooks;
- semantic versions and `CHANGELOG.md`;
- a development diary explaining decisions and lessons;
- sanitised screenshots and demo data suitable for a portfolio.

The live internal application and any future open-source/portfolio edition must be separable. Open sourcing must never disclose Torrance Yachts data, contacts, rates, templates, credentials, private workflows, bank information, or client documents without explicit review and permission.

## 12. Explicitly deferred items

- Public customer booking interface.
- Native mobile app.
- Electron desktop packaging unless web deployment proves insufficient.
- Enterprise SSO and multi-organisation tenancy.
- Large-scale/million-user architecture.
- Fully autonomous AI actions.
- Custom model training.
- WhatsApp/SMS implementation before the notification abstraction and compliance requirements are ready.
- Direct Yachtfolio automation until a supported, secure integration is confirmed.

## 13. Decisions still requiring evidence

These are not missing requirements; they are implementation choices to resolve at the appropriate milestone:

- final production hosting topology and provider;
- Supabase cloud versus a justified alternative;
- n8n cloud versus self-hosted n8n;
- Gmail account/mailbox and forwarding arrangement;
- Google Drive and Calendar account ownership and OAuth scopes;
- exact Google Sheets direction and conflict rules;
- Telegram bot ownership, approval interaction, and recipient mapping;
- first AI provider and rules governing sensitive-data submission;
- whether the app sends approved emails directly or initially hands drafts back to Gmail/Telegram;
- precise roles and account-recovery owner;
- backup retention, document retention, and deletion policy;
- whether live document storage is Supabase Storage, Google Drive, or a controlled combination;
- production domain and deployment ownership;
- the exact boundary between the private Torrance product and any portfolio/open-source derivative.

No unresolved decision should be silently guessed when it would materially affect security, data ownership, recurring cost, or an external business action.
