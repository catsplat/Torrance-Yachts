# Phase 4 enquiry schema

The canonical implementation is `supabase/migrations/20260715160000_create_enquiry_pipeline.sql`.

## Records

| Table | Purpose | Mutation boundary |
| --- | --- | --- |
| `enquiries` | Authoritative charter-enquiry facts and current state | Active staff insert/update; no delete; state only through RPC |
| `enquiry_status_history` | Immutable lifecycle transitions and reasons | Database trigger inserts; application read-only |
| `enquiry_notes` | Append-only internal, requirement, and follow-up notes | Active staff insert; no update/delete |
| `workflow_events` | Durable domain facts for later automation | Database trigger inserts; application read-only |

`enquiries.reference` is generated from a sequence as `ENQ-YYYY-NNNN`. Enquiries link to the Phase 2/3 profile, yacht, contact, and company records using restrictive foreign keys.

## Controlled values

- `enquiry_status`: new, waiting for reply, offer sent, negotiating, contract issued, awaiting signatures, booked, charter active, completed, archived, cancelled.
- `enquiry_priority`: low, normal, high, urgent.
- `enquiry_source`: manual, email, import.
- `enquiry_note_kind`: internal, requirement, follow-up.

Only `manual` is produced by the Phase 4 interface. Email and import values reserve explicit provenance for later adapters.

## Lifecycle functions

- `is_valid_enquiry_transition` describes allowed edges.
- `guard_enquiry_status` blocks a non-new insert and every direct state update.
- `transition_enquiry_status` is the authenticated command; it validates the user, reason, row access, and transition.
- `record_enquiry_lifecycle` inserts history and an event in the successful mutation transaction.

The booking edge is not available in the transition graph. Phase 6 will own that consequential command.

## Validation and audit

Database checks enforce requester presence, paired and ordered dates, bounded guest count, paired budget/currency, valid currency format, and text lengths. A reference-validation trigger verifies the operational role/status of newly assigned people, companies, yachts, and owners.

Normalisation trims text and uppercases currency. Generic actor-attribution and audit triggers preserve creator/updater metadata and write enquiry/note changes to `audit_events`.

## Indexes

Indexes support state/update ordering, owner/state work queues, yacht/date queries, customer/broker lookups, enquiry timelines, and workflow-event consumers. Availability remains a future booking/reservation query; an enquiry date is a request, not a date block.

## Test coverage

The Phase 4 pgTAP suite verifies table/RLS presence, anonymous and inactive-user denial, required fields, reference-role eligibility, active-staff CRUD boundaries, direct-transition denial, allowed and invalid transitions, required reasons, immutable notes/history/events, actor attribution, audit events, and the absence of a Phase 4 booking shortcut.

Together with Phases 2 and 3, the local database suite contains 79 assertions.
