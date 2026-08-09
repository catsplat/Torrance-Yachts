# Automation and n8n boundary

## Role of n8n

n8n is the integration and background-work runner. It is not the business
database, state machine, pricing engine, or approval authority.

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
  - schedules bounded application adapters
              |
              v
Application provider adapter
  - calls the approved provider with Vault-backed credentials
  - records provider identifiers and delivery result
  - retries transient failures idempotently through the outbox
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

## Phase 11 implementation

Development uses the pinned n8n Community Edition image in
`automation/docker-compose.yml`. The editor and webhook surface bind only to
`127.0.0.1:5678`, workflow definitions are version controlled, and n8n calls the
application through a server-only shared-secret contract.

The application owns delivery records and grants short leases to workers. n8n
reports provider success or failure using those delivery identifiers. A crashed
worker can therefore be retried without losing the work or changing authoritative
business records.

Staff-authorised Google credentials are encrypted behind Supabase Vault and are
never exposed to n8n or the browser UI. Live Gmail monitoring, Telegram delivery,
Calendar events, Drive copies and Sheet writes remain disabled until their
separate acceptance steps. Synthetic contracts do not claim live provider
commissioning.

## Production topology

Phase 12 selected managed Supabase Pro plus a protected Linux VPS running the
standalone Next.js application, pinned n8n Community Edition, ClamAV, and an
outbound-only Cloudflare Tunnel as the primary hosted release. Cloudflare Access
protects the sole application hostname; n8n has no public application route.
PostgreSQL remains authoritative. Provider credentials remain outside source
control and ordinary application tables; Google refresh credentials are held
behind the service-only Vault boundary.

The separately requested local packaged version remains documented as a future
secondary distribution. It requires Windows and macOS packaging, signing,
upgrades, backups, and a reliable strategy for scheduled work while the client
computer is off, so it is not represented as a one-file conversion.
