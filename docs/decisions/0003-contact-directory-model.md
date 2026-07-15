# ADR 0003: One contact record with role sets and explicit relationships

**Status:** Accepted

**Date:** 15 July 2026

## Context

The charter workflow refers to customers, charterers, brokers, captains, crew, suppliers, and operations contacts. One person can hold several of those roles and may be connected to both a company and one or more yachts. Separate customer, broker, and captain tables would duplicate identity and communication details, while a single free-text `type` would not support reliable filtering or workflow rules.

The directory is also the intended PostgreSQL source for the captain details required by booking task 2.A. Google Sheets may later display or import this data, but must not become authoritative.

## Decision

Store every person once in `contacts`. Store their validated roles as a PostgreSQL enum array on that record. Model company membership and yacht responsibility as separate relationship records:

- `company_contacts` records company, job title, and primary-company status;
- `yacht_contacts` records yacht, responsibility, primary status, and whether the relationship is an eligible notification route.

Companies and contacts use an `active` lifecycle flag. Hard deletion remains administrator-only at the database boundary and is intentionally absent from the Phase 3 interface. Active staff may add or remove relationship records because those assignments change operationally and every change is audited.

## Consequences

### Benefits

- One email address and phone number are maintained for a person regardless of role.
- Role changes are atomic with the contact update and appear in the contact audit event.
- Company and yacht context stays structured instead of being hidden in notes.
- One primary company per contact and one primary contact per yacht responsibility are enforced by PostgreSQL.
- Enquiries can later link to the same broker/customer records without duplication.
- Task 2.A can resolve the reviewed primary captain from yacht relationships.

### Costs and limits

- Role values are controlled by a migration rather than user-created free text.
- Adding a new role requires a reviewed enum migration.
- The initial directory performs bounded in-process filtering after an RLS-protected query because the deployment is small. A database search function or full-text index will be introduced before the directory exceeds the documented bound.
- An `active` contact is not automatically a valid notification recipient; the yacht relationship must opt in separately.

## Rejected alternatives

- **Separate table for every contact type:** duplicates people who hold multiple roles.
- **Free-text contact type:** cannot reliably filter or drive workflows.
- **Role join table:** correct but adds four-way CRUD and transaction complexity without current benefit; the small fixed role set is an appropriate PostgreSQL array.
- **Captain phone only on the yacht record:** retains no person identity, company, job title, or reusable audit trail.
- **Google Sheets as the contact source:** conflicts with the platform's source-of-truth rule and makes permissions/audit unreliable.

## Guardrails

- Contact fixtures and screenshots remain synthetic.
- No public route exposes directory data.
- RLS is enabled before the application queries these tables.
- A contact must have at least one valid role.
- Notification eligibility never sends a message by itself; later notification actions still require the approved workflow and recipient checks.
