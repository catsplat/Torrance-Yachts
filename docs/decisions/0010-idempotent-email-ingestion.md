# ADR 0010: Idempotent email ingestion with deterministic safe routing

**Status:** Accepted

## Decision

Use an authenticated server-to-server endpoint for Gmail/n8n delivery. Store Gmail
message and thread identifiers in PostgreSQL with unique constraints so provider
retries cannot duplicate operational records.

Phase 9 automatically routes only cases supported by deterministic evidence:

- an already-linked Gmail thread is an enquiry follow-up;
- mailing-list/bulk headers identify a circular;
- a configured sender domain identifies internal email.

Everything else enters human review. Human classification can create or reuse the
sender contact, create a new enquiry, associate a follow-up, correct a category, or
request circular mark-read/archive actions. AI may suggest those decisions in Phase
10 but cannot become the authority.

## Consequences

- Gmail push/history delivery can be retried safely.
- Provider actions are durable outbox records for n8n in Phase 11.
- Raw provider credentials remain outside PostgreSQL and source control.
- Plain-text message content is immutable to staff after ingestion.
- Attachments remain metadata-only until an approved quarantine/storage policy is
  implemented.
