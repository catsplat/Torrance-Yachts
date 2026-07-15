# Case study: modelling charter relationships without duplicate contacts

## Challenge

The charter workflow depends on customers, charterers, brokers, captains, crew, operations staff, suppliers, and companies. People can hold more than one role, and their responsibilities vary by yacht. Treating each label as a separate address book would duplicate contact details and make email matching, notification routing, audit history, and booking tasks unreliable.

The immediate operational dependency was booking task 2.A: provide the broker with the selected yacht's captain details. The source needed to be structured and secure before enquiries and bookings were added.

## Delivered slice

Phase 3 introduced a canonical internal directory. Each person is stored once with one or more controlled roles. Separate relationship records capture company membership and yacht responsibility, including primary ownership and future notification eligibility.

The interface supports:

- contact and company create, list, detail, and edit workflows;
- multi-role contacts and active/inactive lifecycle management;
- text, role, and status filtering;
- company job-title and primary relationships;
- yacht captain, manager, operations, notification, crew, and other responsibilities;
- bidirectional navigation between contacts, companies, and yachts;
- database-owned audit attribution for master and relationship changes.

## Engineering decisions

PostgreSQL remains the source of truth. The Google Sheet mentioned in the original workflow can later become an import or synchronised view, but no booking task will depend on spreadsheet state.

Yacht responsibility is modelled on a join record rather than the contact itself. This makes it possible for one person to manage one yacht, crew another, and receive notifications only where explicitly approved.

Normal lifecycle management deactivates master records instead of deleting history. Database policies allow administrator-only hard deletion of unreferenced records, while staff can safely maintain operational relationships.

## Verification

The candidate passed ESLint, strict TypeScript checks, a production build, ten application tests, forty-two database assertions, and schema linting with no findings. Browser acceptance covered creation, update, company and yacht relationships, cross-record visibility, filtering, mobile layout, and authentication boundaries.

## Skills demonstrated

- translating a domain workflow into canonical entities and explicit relationships;
- distinguishing a person's general role from a yacht-specific responsibility;
- applying least-privilege PostgreSQL policies and database-owned audit trails;
- preparing master data for enquiry, booking, and notification slices without prematurely connecting integrations;
- maintaining reproducible architecture, development, verification, and portfolio records alongside code.

All examples use synthetic identities and contact channels. No live customer, broker, captain, employee, or company data is included.
