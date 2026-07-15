# Manual enquiry pipeline vertical slice

## Purpose

Phase 4 turns the secured master-data foundation into a usable manual enquiry register. An authenticated employee can record a charter request, connect it to reviewed people, companies, and yachts, maintain its requirements, add permanent notes, and progress it through controlled states with a complete history.

## Request and data flow

```text
Authenticated browser
  -> Next.js enquiry pages and Server Actions
  -> server-side identity verification and Zod validation
  -> authenticated Supabase client
  -> PostgreSQL grants and Row Level Security
  -> reference validation and controlled transition command
  -> enquiries / notes / status history / workflow events
  -> database-owned audit events
  -> enquiry list, detail timeline, and live dashboard count
```

Every Server Action verifies the user again. The browser supplies editable enquiry values; it cannot supply trusted actor fields or change status through the ordinary update action. PostgreSQL remains the final authorisation and lifecycle boundary.

## Responsibilities

### Enquiries

- Stable human-readable references such as `ENQ-2026-0001`.
- Customer/charterer, broker, broker company, requested yacht, and internal owner links.
- Summary, priority, charter dates, guest count, ports, budget, and currency.
- At least one requester: customer, broker, or broker company.
- Both charter dates or neither, in chronological order.
- Budget and ISO-style three-letter currency together or neither.

### Reference eligibility

- Customer selections must be active contacts with customer or charterer roles.
- Broker selections must be active broker contacts.
- Broker companies and owners must be active.
- Inactive yachts cannot be newly selected.
- Existing links remain readable if a master record is later deactivated; changing a link revalidates it.

### Lifecycle

The manual slice supports:

```text
New <-> Waiting for reply -> Offer sent <-> Negotiating
                                  |              |
                                  +--> Contract issued <-> Awaiting signatures

Open states -> Cancelled -> Archived
Open states -------------> Archived
```

The exact graph is enforced by `is_valid_enquiry_transition`. Every state change goes through `transition_enquiry_status` with a reason. `Booked` exists in the full lifecycle vocabulary but cannot be entered in Phase 4.

### Notes and events

Notes are append-only and categorised as internal, client requirement, or follow-up. Creation and status changes record durable workflow events. These events do not send notifications or run integrations yet; later consumers will add explicit idempotency and processing records.

## Security model

| Capability | Anonymous | Inactive user | Active staff | Administrator |
| --- | ---: | ---: | ---: | ---: |
| Read enquiries, notes, history, and events | No | No | Yes | Yes |
| Create/update enquiry details | No | No | Yes | Yes |
| Change state through command with reason | No | No | Yes | Yes |
| Edit/delete a note | No | No | No | No |
| Hard-delete an enquiry | No | No | No | No |
| Insert history/events directly | No | No | No | No |

## Interface boundary

The enquiry list provides bounded search and filters for state, priority, and yacht. The detail screen separates editable facts from consequential lifecycle changes and shows append-only notes and status history. The dashboard now reads the open-enquiry count and pipeline from PostgreSQL; task, booking, and document previews remain visibly labelled synthetic until their phases.

## Deferred consumers

- Phase 5 creates versioned commercial profiles, yacht-specific offer drafts, and sent-offer records.
- Phase 6 creates bookings and date reservations through human confirmation.
- Phase 9 associates Gmail messages and threads idempotently.
- Phase 10 proposes extractions and drafts with evidence and human approval.
- Phase 11 processes workflow events through controlled notification and integration adapters.
