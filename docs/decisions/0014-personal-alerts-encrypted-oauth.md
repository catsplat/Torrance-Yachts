# ADR 0014: Personal alert routing and encrypted OAuth credentials

**Status:** Accepted

## Context

The initial notification materialiser routed operational alerts to one default
administrator. A four- or five-person internal team needs individual destinations,
topic preferences, and delivery credentials without sharing accounts or exposing
secrets to the browser, source control, or n8n workflow definitions.

## Decision

Each active profile has one personal notification-preference record covering:

- in-app, Telegram, and email routes;
- email, task, payment, charter, and integration-failure topics;
- whether clearly labelled AI summaries are included.

Telegram uses one company-controlled server bot token and a per-user chat ID.
Gmail client credentials and refresh tokens are encrypted in Supabase Vault.
Normal application queries return connection metadata only and cannot retrieve
secret values.

The application adapter may:

- send internal staff Telegram alerts;
- send internal staff email alerts;
- create an approved external Gmail draft.

It may not send external email, confirm bookings, change operational state, or
complete tasks. External drafts remain a human approval and Gmail-send workflow.

## Consequences

- Staff receive only the alerts they choose through their own channels.
- Credentials are isolated by user and revocable without changing application
  code or n8n.
- The notification bell becomes a real personal inbox with read state.
- Failed provider work remains in the transactional outbox.
- OAuth onboarding requires the staff member to supply a valid refresh-token
  credential set until a future managed Google consent screen is approved.
