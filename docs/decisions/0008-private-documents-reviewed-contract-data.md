# ADR 0008: Private documents and reviewed financial facts

**Status:** Accepted

## Decision

Store sensitive booking files in a non-public Supabase Storage bucket. PostgreSQL
stores authoritative metadata, requirements, verification, versions, reviewed
contract fields, payment schedules, and commission calculations.

File access uses short-lived signed URLs. A verified charter agreement is required
before contract fields can be saved, and a second explicit approval creates payment
obligations. Commission is deterministic percentage arithmetic enforced by a
database constraint.

## Consequences

- Identity and compliance documents never use public URLs.
- Uploading does not imply verification.
- AI extraction can later populate a draft, but cannot approve it.
- Payment tasks receive dates only from approved reviewed contract data.
- Storage and metadata failures are compensated so orphan uploads are removed.
