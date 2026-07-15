# Automation and n8n boundary

## Role of n8n

n8n is the planned integration and background-work runner. It is not the business database, state machine, pricing engine, or approval authority.

```text
Human action / reviewed command
              |
              v
PostgreSQL transaction
  - validates the state change
  - changes authoritative records
  - appends a workflow event
              |
              v
Outbox delivery claim
              |
              v
n8n workflow
  - calls Gmail, Telegram, Drive, Calendar or Sheets
  - records provider identifiers and delivery result
  - retries transient failures idempotently
              |
              v
Visible success or failure in the application
```

## Reliability model

- Every integration action receives a stable event/delivery identifier used as its idempotency key.
- A retry cannot create a second task, notification, email, file, or calendar event.
- Delivery attempts, external identifiers, timestamps, errors, and retry state are persisted.
- Failed integrations do not roll back or corrupt the authoritative enquiry, offer, or booking.
- Operators can see and retry failed deliveries.
- Small workflows handle one responsibility each; there is no single giant scenario.

## Human approval

n8n may prepare a Telegram approval request or place an approved email into Gmail, but the underlying application command decides whether the action is allowed. AI output remains a proposal with source evidence and confidence. Material actions—including approving/sending offers, confirming bookings, blocking dates, issuing invoices, or contacting external parties—require an authenticated human decision.

## Hosting decision

Development can use local n8n. Production will use either a small protected Linux VPS or n8n Cloud after the Phase 11 cost, backup, access-control, and maintenance comparison. No n8n service is required or created during Phase 5.
