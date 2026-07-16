# ADR 0012: Transactional, leased integration outbox

**Status:** Accepted

## Decision

Represent every external provider action as an idempotent PostgreSQL delivery.
n8n claims deliveries with a five-minute lease, performs one provider operation,
and reports a bounded success or failure result.

n8n is not permitted to infer or mutate business state. Gmail, Telegram, Calendar,
Drive, and Sheets are projections or delivery channels. Human approval remains in
the application.

Invoice PDFs use deterministic commission data and an approved private invoice
profile. PDF generation records a private document but does not send or issue it.

## Consequences

- Provider outages cannot corrupt bookings.
- Retried workflows cannot duplicate external work.
- Integration failures are visible and operator-retryable.
- Local and hosted n8n use the same contract.
- Real account credentials can be introduced during deployment without changing
  business logic.
