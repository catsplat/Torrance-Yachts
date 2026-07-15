# Commercial profiles and offers architecture

## Purpose

Phase 5 turns a structured enquiry into a reviewable yacht-specific commercial response without email, AI, or external automation.

```text
Yacht operational record
        |
        +-- commercial profile
        +-- dated rate periods
        +-- approved public sales materials
        +-- versioned offer template
        |
        v
Enquiry + selected approved sources
        |
        v
Editable offer draft snapshot
        |
        +-- human approval
        |
        +-- human records sent
        |
        v
Offer history + enquiry lifecycle + workflow events
```

## Boundaries

- PostgreSQL is authoritative; templates and rates are not embedded in components or prompts.
- Template rendering is deterministic plain text with a fixed placeholder allow-list.
- Calculations are application code with unit tests; AI does not calculate prices.
- Sales-material links are included only when active and explicitly approved for offers.
- Phase 5 records that a person sent an offer; it does not send an email.
- An enquiry does not reserve availability. Confirmed booking and 24-hour buffers remain Phase 6.
- Historical approved/sent snapshots cannot be edited or deleted through the application.

## Automation contract

The durable events `OfferDraftCreated`, `OfferApproved`, and `OfferMarkedSent` are facts for later consumers. n8n will claim and process events through a delivery/outbox boundary added with integrations; it will not poll mutable tables and infer business state.
