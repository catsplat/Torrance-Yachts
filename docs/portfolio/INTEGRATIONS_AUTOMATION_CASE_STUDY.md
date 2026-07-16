# Portfolio case study: reliable automation without provider authority

Phase 11 demonstrates a transactional outbox and leased-worker architecture for a
small internal operations platform.

The same protocol handles notifications, Gmail actions, calendar projections,
controlled Drive copies, and Sheets snapshots. Stable idempotency keys, expired
lease recovery, bounded backoff, provider identifiers, visible failures, and human
retry controls make the system resilient to webhook retries and provider outages.

The implementation also shows disciplined boundaries: Gmail creates drafts rather
than sending, Google Calendar has no attendees, Sheets is one-way, Drive requires
verified documents, and n8n cannot mutate bookings or payments.
