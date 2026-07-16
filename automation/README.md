# Local n8n automation

The current release pins the verified n8n Community Edition `2.30.5` image for
reproducible local development and production. Patch `2.30.6` was reviewed on
16 July 2026 and contains one non-breaking MCP execution-mode fix, but remains a
maintenance upgrade until its container image passes the same workflow import
and audit gates in this environment.
The editor binds only to `127.0.0.1:5678`; its data and encrypted credentials live
in the `n8n_data` Docker volume.

The Compose project has the explicit identity `torrance-yachts-automation`, so
its encrypted volume is stable and cannot collide with another folder named
`automation`.

## Start

1. Copy `.env.example` to `.env`.
2. Generate a long random `N8N_ENCRYPTION_KEY`.
3. Set the same random `AUTOMATION_SHARED_SECRET` in the application and n8n
   environments.
4. Set the same independent `MONITORING_SHARED_SECRET` in both environments.
5. Run `npm run automation:start`.
6. Open `http://127.0.0.1:5678`, create the local owner, then run
   `npm run automation:import`.

The `N8N_ENCRYPTION_KEY` must remain unchanged for the lifetime of the data
volume. If the ignored `.env` file is lost, do not guess a replacement and do not
delete the volume. Preserve it for recovery and start a separately named clean
development project only after confirming that it contains no required
credentials or execution history.

The imported workflows are inactive by design. The development simulator must
never be enabled on real data.

The readiness workflow calls the authenticated readiness endpoint every five
minutes. A non-ready application makes the workflow fail visibly; production must
attach the approved internal alert/error workflow before activation.

Community packages, the public n8n API/playground, workflow templates, telemetry,
personalisation, and unverified packages are disabled. Built-in provider nodes
remain available for the approved adapters.

## Provider adapters

The application exposes one claim/result contract for all providers. Production
workflows claim deliveries, switch on `operation`, call the relevant n8n node, and
POST either the completion or failure result.

| Operation            | n8n adapter                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `telegram_send`      | Telegram `Send Message`; append the application action URL                                             |
| `gmail_mark_read`    | Gmail message: remove `UNREAD`                                                                         |
| `gmail_archive`      | Gmail message: remove `INBOX`                                                                          |
| `gmail_create_draft` | Gmail draft creation only; never send automatically                                                    |
| `calendar_upsert`    | Google Calendar create/update using the supplied stable event ID, private visibility, and no attendees |
| `drive_upload`       | Download the leased private file URL, then upload to the configured protected Drive folder             |
| `sheets_snapshot`    | Replace the Enquiries, Bookings, and Captains tabs from the one-way snapshot payload                   |

Provider credentials are configured inside n8n and are never exported to Git.
The exact mailbox, bot, chat, calendar, Drive folder, and workbook are selected
during Phase 12 deployment acceptance.

## Failure contract

Transient provider errors use `/fail` with `retryable: true`. PostgreSQL applies
bounded exponential backoff and reclaims expired five-minute leases. Permanent
scope, recipient, or validation failures use `retryable: false` and remain visible
for an administrator.
