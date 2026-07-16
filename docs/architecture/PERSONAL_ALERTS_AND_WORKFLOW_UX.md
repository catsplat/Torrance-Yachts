# Personal alerts and daily workflow UX

## Daily information architecture

The workspace follows the client's operating sequence:

```text
Inbox
  -> Enquiry
  -> Offer
  -> Booking
  -> Numbered operations
  -> Charter
  -> Broker follow-up
```

The primary navigation presents that sequence first. Yachts, Contacts, and
Documents are supporting registers. AI review, integrations, and settings are
secondary tools.

The dashboard prioritises items requiring action rather than decorative totals:

- email and AI review;
- enquiry replies;
- offer approvals;
- overdue numbered tasks;
- failed delivery work;
- today's task priorities and upcoming charters.

## Alert flow

```text
Stored operational fact
  -> optional evidence-backed AI suggestion
  -> per-user topic filter
  -> in-app / Telegram / internal email
  -> transactional delivery outbox
  -> n8n scheduled application adapter
  -> provider success or bounded failure
```

Every user can configure their own destinations and topics in
`Settings -> My alerts and connections`. In-app alerts remain the safe default.

## Task communication assistance

The numbered workflow exposes preparation actions at the relevant task:

- `0.A`: approved KYC/passport request to an internal Telegram draft;
- `2.A`: approved primary-captain contact template to an internal Telegram draft;
- `2.B`: reviewed primary-captain Gmail draft;
- `7`: approved broker follow-up template to an internal Telegram draft;
- `1.C`: direct route to deterministic commission invoice generation.

Preparing a communication does not complete the task and does not send an
external message. The staff member reviews delivery separately and records task
completion with evidence.

## Credential boundary

- OAuth client IDs, client secrets, and refresh tokens are encrypted in Vault.
- The Settings UI cannot read secrets back.
- The n8n scheduler receives no user OAuth secret.
- The delivery adapter receives decrypted values only for a claimed, supported
  delivery.
- The shared Telegram bot token is server-only.
