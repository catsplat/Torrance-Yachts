# Phase 11 integrations, notifications, and calendar architecture

Phase 11 turns durable operational facts into observable, retryable external work.
PostgreSQL remains authoritative; the application-owned scheduler and provider
systems are adapters.

```text
Booking/email/task/payment fact
  -> deterministic materialisation
  -> notification/calendar/provider action
  -> integration delivery outbox
  -> five-minute worker lease
  -> application provider adapter
  -> success/failure callback
  -> visible audit and retry state
```

## Human control

- Telegram and Gmail drafts can be created for review.
- Gmail delivery creates drafts only; it never sends automatically.
- Drive copies require an explicit request against a verified document.
- Sheet synchronisation is one-way from PostgreSQL.
- Calendar events contain no attendees and request no update emails.
- The scheduler cannot call booking, task, payment, offer, Yachtfolio, or AI approval
  commands.

## Reliability

Each delivery has a unique idempotency key, bounded attempts, next-attempt time,
lease owner/expiry, provider result, error details, and source record. Expired
leases are reclaimable. Transient failures use bounded exponential backoff;
administrators can explicitly retry terminal failures.

## Internal calendar

Charters, payment instalments, and due tasks are materialised into the internal
calendar first. Google Calendar receives a private duplicate using the stable
32-character event ID derived from the database UUID. Booking/task/payment facts
remain the date source.

## Deployment boundary

Local development may use pinned n8n Community Edition in Docker on
`127.0.0.1:5678` for rehearsal. The hosted profile uses the application-owned
worker. Real Telegram/Google credentials, mailbox, bot/chat, calendar, Drive
folder and workbook are selected and accepted during hosted activation.
