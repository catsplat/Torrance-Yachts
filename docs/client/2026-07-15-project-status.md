# Torrance Yachts platform: client progress summary

**Updated:** 16 July 2026

The project has moved from planning into a working, secured internal application. Nine of twelve planned delivery phases are released through version 0.9.0.

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

## Released through Phase 8

The application can now create a booking only after a staff member confirms that the charter agreement is signed by all required parties and records what they reviewed. It links the booking to its enquiry and sent offer, blocks the yacht from 24 hours before until 24 hours after the charter, prevents overlapping reservations at database level, and creates a visible manual action to add the dates and Booked status in Yachtfolio. Booking amendments, charter start/completion/cancellation, Yachtfolio completion/reopening, the live register, availability checker, yacht view, enquiry link, and dashboard are all audited and verified with synthetic data.

The booking now receives the complete operational checklist automatically. Tasks follow the supplied numbered sequence, remain blocked until prerequisites are complete, unlock automatically, carry reviewed dates, priorities and assignees, and retain evidence when completed or reopened. Administrators can clone and edit versioned workflow templates, including steps and dependencies, without changing historical bookings.

The task register, booking checklist, dashboard priorities, notes, reminders, escalation settings, and permitted ad-hoc work are implemented. Booking date amendments reschedule relevant tasks and booking cancellation closes remaining open work.

## Released Phase 9

The application now accepts authenticated, retry-safe email deliveries; stores immutable Gmail messages and threads; routes known follow-ups, internal domains, and circulars deterministically; and presents uncertain mail for human review. Staff can create or reuse a sender contact and enquiry from the email record, link follow-ups, and correct classifications with history.

Configurable inactivity settings automatically archive low-conversion pre-contract enquiries after different periods for New, Waiting for reply, Offer sent, and Negotiating. Records remain searchable and auditable.

Current verification includes 49 application tests and 349 database security/behaviour assertions.

## Still to come

The later phases add AI-assisted extraction and drafting, notifications and calendar/Google integrations, local n8n automation, invoice generation, optional desktop packaging, followed by production security, backups, staff acceptance, training, and launch.

## Current status

The technical foundation and operational workflow from imported email through enquiry, offer, human-confirmed booking, generated tasks, protected documents, and reviewed payment schedules is working with synthetic data. The system is not yet approved for production or live data, and it does not yet connect to the real Gmail mailbox or send notifications. Development remains on the agreed dependency-safe path toward the complete enquiry-to-charter workflow.
