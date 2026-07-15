# Case study: making an enquiry pipeline safe before automating it

## Challenge

The business currently handles charter enquiries manually from email through offers, contracts, booking, and operations. The tempting first step was email classification and AI drafting, but those tools would have had no reliable, auditable workflow to update. A free-form CRM status would also allow an enquiry to appear booked without a signed-contract review, date reservation, or downstream tasks.

## Delivered slice

Phase 4 introduced the manual operational pipeline on top of the secured yacht and contact directory. Staff can create a structured enquiry, assign the relevant people/company/yacht and owner, capture dates and commercial requirements, add permanent notes, search and filter the pipeline, and progress it through approved states with a reason and immutable timeline.

The dashboard's enquiry count and pipeline are now real database queries. Later task, booking, and document metrics remain explicitly labelled synthetic so the interface does not imply unfinished modules are operational.

## Engineering decisions

PostgreSQL, not the page or a spreadsheet, enforces the lifecycle. Direct status changes are rejected. A dedicated command validates the transition and writes current state, history, workflow event, actor, and audit evidence atomically.

Booking was deliberately excluded as a Phase 4 transition. It will be a separate human-confirmed operation that can validate reviewed contract fields, block buffered yacht dates, and create downstream work together.

Reference validation distinguishes a structurally valid foreign key from a business-valid assignment: a broker must actually be an active broker, a customer must have a customer/charterer role, and an owner must be active.

## Verification

The candidate passed ESLint, strict TypeScript checks, twenty application tests, seventy-nine database assertions, and database schema linting with no findings. Browser and clean production-build evidence are maintained in the Phase 4 audit record and pull request.

## Skills demonstrated

- translating an operational lifecycle into an explicit state machine;
- enforcing consequential business rules in PostgreSQL as well as the interface;
- designing immutable history and durable events for future automation;
- preventing premature coupling to email, AI, Sheets, or n8n;
- separating requested charter dates from authoritative booking availability;
- documenting architecture, decisions, verification, and delivery status alongside the implementation.

All examples are synthetic. No live enquiries, client messages, rates, contacts, or confidential terms are included.
