# Torrance Yachts platform: historical client progress summary

**Updated:** 26 July 2026
**Historical note:** This is an archived project-status snapshot. For the current
release state and activation gates, use the [completion register](../planning/PROJECT_COMPLETION_REGISTER.md).

The project has moved from planning into a working, secured internal application.
All twelve planned implementation phases are complete, followed by the
`v0.13.0` workflow-hardening release.

## Completed

- A professional private web-application foundation with responsive desktop and mobile navigation.
- Individual staff login and protected internal pages.
- A structured yacht register containing operational details and yacht-specific notification information.
- A central contact and company directory for customers, brokers, captains, operations staff, suppliers, and other roles.
- The ability to assign reviewed captain, management, operations, crew, and notification responsibilities to each yacht.
- A structured manual enquiry pipeline linking customers, brokers, companies, yachts, dates, requirements, budgets, priorities, notes, and internal owners.
- Controlled enquiry status changes with mandatory reasons, permanent lifecycle history, workflow events, search, filtering, and live dashboard counts.
- Database-level access controls, validation, change attribution, audit history, automated tests, continuous integration, and maintained project documentation.

All development and demonstrations currently use synthetic information. No live client, broker, captain, contract, identity-document, banking, or confidential commercial data has been entered.

## Released Phases 6-8

The application can now create a booking only after a staff member confirms that the charter agreement is signed by all required parties and records what they reviewed. It links the booking to its enquiry and sent offer, blocks the yacht from 24 hours before until 24 hours after the charter, prevents overlapping reservations at database level, and creates a visible manual action to add the dates and Booked status in Yachtfolio. Booking amendments, charter start/completion/cancellation, Yachtfolio completion/reopening, the live register, availability checker, yacht view, enquiry link, and dashboard are all audited and verified with synthetic data.

The booking now receives the complete operational checklist automatically. Tasks follow the supplied numbered sequence, remain blocked until prerequisites are complete, unlock automatically, carry reviewed dates, priorities and assignees, and retain evidence when completed or reopened. Administrators can clone and edit versioned workflow templates, including steps and dependencies, without changing historical bookings.

The task register, booking checklist, dashboard priorities, notes, reminders, escalation settings, and permitted ad-hoc work are implemented. Booking date amendments reschedule relevant tasks and booking cancellation closes remaining open work.

## Released Phase 9

The application now accepts authenticated, retry-safe email deliveries; stores immutable Gmail messages and threads; routes known follow-ups, internal domains, and circulars deterministically; and presents uncertain mail for human review. Staff can create or reuse a sender contact and enquiry from the email record, link follow-ups, and correct classifications with history.

Configurable inactivity settings automatically archive low-conversion pre-contract enquiries after different periods for New, Waiting for reply, Offer sent, and Negotiating. Records remain searchable and auditable.

## Released Phase 10

The application can now generate structured suggestions for uncertain emails,
including category, summary, customer and charter facts, confidence, exact source
evidence, and a draft response. Staff can correct the result, record why, and
approve or reject it. A separate human action is still required before any
classification or enquiry data changes.

For verified charter agreements, staff can paste only the relevant clauses and
receive a reviewable extraction of dates, parties, ports, fees, tax, commission,
and instalments. The suggestion cannot approve contract data or calculate
financial obligations. Versioned communication templates now support KYC
requests, captain-contact drafts, and broker follow-up wording.

The default local assistant works without a paid AI service. OpenAI can be enabled
later through server-only configuration after the production data policy is
approved.

## Released Phase 11

The application now has one central notification and external-delivery system.
Telegram alerts, Gmail actions/drafts, private Calendar entries, controlled Drive
copies, and professional Sheets snapshots all use the same retry-safe queue. Staff
can approve messages, see failures, and retry them without external outages
changing the booking record.

Charters, payment dates, and tasks appear in the internal calendar. Commission
invoice PDFs are generated from reviewed calculations and protected, versioned
invoice details rather than AI or source-controlled bank information.

Local n8n Community Edition is installed through Docker, and the complete
application-to-n8n delivery contract has been tested with synthetic data. Real
provider accounts remain disconnected until deployment acceptance.

Current verification includes 85 application tests, a local Ollama acceptance
test, and 610 database security/behaviour assertions.

## Phase 12 release candidate

The final implementation phase adds the guided in-product tutorial and a
completely isolated fake email-to-follow-up practice journey. It also adds staff
invitation/password recovery, evidence-based launch acceptance, protected health
monitoring, backup/export tooling, a proven local restore drill, and the complete
deployment, incident, privacy, maintenance, staff, and acceptance documentation.

The current hosted direction is the lean self-hosted Supabase profile on a
protected Linux VPS, with an application-owned scheduler and Cloudflare Access.
The requested downloadable local-app direction is preserved as a separate future
distribution and is not allowed to delay the primary hosted release.

## v0.13 workflow hardening

The daily interface now follows the real operating order from Inbox through
Enquiry, Offer, Booking, Operations, and Follow-up. The previously inactive
notification bell and workspace search are complete, the dashboard prioritises
work requiring attention, and each staff member can use a persistent dark theme.

Every staff member can configure their own alert email, phone, Telegram chat ID,
channels, topics, and optional AI-summary content. Personal Gmail OAuth
credentials are encrypted in Supabase Vault and are not readable back through
the Settings interface. Internal alerts can be delivered automatically; external
emails remain approval-controlled Gmail drafts.

Pending email AI analysis is now part of the bounded automation tick, allowing
new-enquiry, follow-up, internal, and unknown-message alerts to contain clearly
labelled summaries and suggested replies. The numbered task pages now prepare
the required KYC, captain-contact, captain-notification, and broker follow-up
communications from approved templates and authoritative records.

## Client activation still required

- approve and purchase the client-owned domain, Supabase production project, and
  Linux server;
- supply and approve the real Gmail, Telegram, Google, and automation credentials;
- approve retention/privacy, incident, account-recovery, and off-site backup rules;
- complete the full synthetic acceptance walkthrough on the employee's Mac;
- complete staff training and record the final go-live decision.

## Current status

The full technical workflow from imported email through enquiry, offer,
human-confirmed booking, generated tasks, protected documents, reviewed payments,
notifications, calendar, charter completion, and follow-up is working with
synthetic data. Local offline assurance, backup/restore, and provider-contract
rehearsals are complete. The software is not yet approved for live data because
client-owned services and final acceptance are external launch gates rather than
coding tasks. Use `LIVE_ACTIVATION_UAT.md` for the next stage.
