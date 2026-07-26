# ADR 0020: Telegram deep-link pairing

**Status:** Accepted

## Context

Telegram is the first staff alert channel, but asking an employee to discover
and copy a numeric chat ID is technical, error-prone, and unlike the connection
experience of other internal tools.

The platform already has a company-controlled bot token and per-user Telegram
destination field. It needs a clearer onboarding path without letting Telegram
or n8n change bookings, tasks, or other authoritative records.

## Decision

- A signed-in staff member can request a short-lived Telegram pairing link.
- The raw token is generated server-side, shown only in that staff member&apos;s
  action response, and expires after ten minutes. PostgreSQL stores only its
  SHA-256 hash.
- The link opens the configured company bot with a constrained `/start ty_…`
  payload. Telegram sends the resulting chat ID to a dedicated webhook.
- The webhook accepts only calls bearing Telegram&apos;s configured secret header,
  validates the narrow update shape, hashes the token, and invokes a
  service-role-only database command.
- The command atomically records the staff member&apos;s chat ID, enables their
  Telegram alert route, consumes the request, and emits one audit/workflow
  event. Replays and expired links are ignored.
- The manual chat-ID field remains an explicit recovery fallback, not the
  normal setup experience.

## Consequences

- Staff do not handle technical identifiers in the normal setup path.
- A client-owned bot username, webhook secret, Bot API token, and HTTPS webhook
  registration are still required before the button is enabled outside local
  development.
- Pairing establishes an internal alert destination only. It cannot send broker
  messages, confirm bookings, reserve yachts, or alter workflow state.
