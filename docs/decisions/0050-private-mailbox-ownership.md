# Decision 0050: Private mailbox ownership and explicit operational sharing

Date: 2026-08-17

## Decision

Imported Gmail threads, messages, and ingestion events carry an immutable
`owner_user_id` associated with the connected account that supplied the
mail. Active staff can read their own imported mailbox, but an administrator
does not receive a content-level bypass. A thread becomes shared company data
only when a human-controlled workflow action links it to an enquiry or other
existing operational record.

The migration derives legacy ownership only from the explicitly enabled
`gmail_ingestion_settings.user_id`. If that mapping is unavailable, the
migration fails rather than assigning private messages to an administrator.

## Boundaries

- The owner-aware ingestion RPC is service-role-only; the application passes
  the selected connected-account user ID from Gmail reconciliation.
- Email attachments, classification history, provider actions, AI runs,
  suggestions, evidence, and revisions follow the message visibility boundary.
- The notification materialiser may continue to create its normal candidate
  rows, but a database trigger suppresses private email notifications for
  unrelated recipients and removes any legacy rows during migration.
- Existing OAuth tokens remain per-user encrypted Vault secrets; this change
  does not add a shared token or relax `user_oauth_connections` RLS.

## Consequences

The inbox is a personal review surface until an email is promoted into shared
workflow data. Existing shared enquiry threads remain visible to approved
staff, and newly promoted enquiries use the existing company-wide enquiry RLS.
Production rollout must confirm that the selected Gmail mailbox maps to the
intended user before applying the migration.
