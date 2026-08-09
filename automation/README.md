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
4. Set the same independent `EMAIL_INGESTION_TOKEN` in both environments.
5. Set the same independent `MONITORING_SHARED_SECRET` in both environments.
6. Run `npm run automation:start`.
7. Open `http://127.0.0.1:5678`, create the local owner, then run
   `npm run automation:import`.

The `N8N_ENCRYPTION_KEY` must remain unchanged for the lifetime of the data
volume. If the ignored `.env` file is lost, do not guess a replacement and do not
delete the volume. Preserve it for recovery and start a separately named clean
development project only after confirming that it contains no required
credentials or execution history.

The imported workflows are inactive by design. The development simulator must
never be enabled on real data. It identifies itself as
`n8n-development-simulator`; the application rejects that worker at its
claim/result API boundary unless `APP_ENVIRONMENT=development`. This is a
defence-in-depth safeguard, not permission to import the simulator outside the
local rehearsal environment.

The readiness workflow calls the authenticated readiness endpoint every five
minutes. A non-ready application makes the workflow fail visibly; production must
attach the approved internal alert/error workflow before activation.

Community packages, the public n8n API/playground, workflow templates, telemetry,
personalisation, and unverified packages are disabled. Built-in provider nodes
remain available for the approved adapters.

## Gmail intake

`04-gmail-ingestion.json` is the production intake bridge. It is inactive on
import and contains no credential. During staged activation, assign the
client-owned Gmail OAuth credential to **Company Gmail inbox**, manually run it
with a fictional message, verify the single durable Inbox record and replay
safety, then activate it explicitly.

The trigger requests full message text but never downloads attachments. It
posts each message to the server-side n8n normalisation endpoint using
`EMAIL_INGESTION_TOKEN`. The application validates and bounds the raw trigger
item before calling the same idempotent PostgreSQL command as the offline
rehearsal. Attachments remain metadata-only and cannot bypass the private
document/quarantine workflow.

`05-gmail-mark-read-worker.json` and `06-gmail-archive-worker.json` consume only
their declared Gmail action from the shared outbox. Assign the same
client-owned Gmail credential used by the intake trigger to each Gmail node.
Each worker retries a transient provider request and reports both success and
failure to the application; capability-scoped leases prevent either worker
from claiming Calendar, Drive, or Sheets work it cannot perform.

## Provider adapters

The scheduler first asks the application to materialise work, then asks the
application to deliver staff Telegram alerts, staff email alerts, and approved
Gmail drafts. This narrow adapter can safely use each staff member's encrypted
OAuth connection without exposing credentials to n8n.

The core scheduler calls the application-owned Google Workspace dispatcher.
Calendar, Drive and Sheets use the administrator-selected staff OAuth connection
held in Vault; n8n never receives those credentials. The generic claim/result
contract remains available for explicit future adapters and compatibility.

| Operation            | n8n adapter                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `telegram_send`      | Application adapter using the server-side company bot token and the staff member's chat ID              |
| `gmail_send_internal`| Application adapter using the staff member's encrypted Gmail OAuth credentials                          |
| `gmail_mark_read`    | Gmail message: remove `UNREAD`                                                                         |
| `gmail_archive`      | Gmail message: remove `INBOX`                                                                          |
| `gmail_create_draft` | Application adapter creates a Gmail draft after approval; it never sends automatically                  |
| `calendar_upsert`    | Google Calendar create/update using the supplied stable event ID, private visibility, and no attendees |
| `drive_upload`       | Download the leased private file URL, then upload to the configured protected Drive folder             |
| `sheets_snapshot`    | Replace the Enquiries, Bookings, and Captains tabs from the one-way snapshot payload                   |

Personal Google credentials are encrypted in Supabase Vault through
`Settings -> My alerts and connections`; the UI cannot read them back. The shared
Telegram bot token remains server-only. The administrator selects which connected
staff account supplies Gmail intake and shared Google delivery; n8n receives only
the application scheduler secret.

## Failure contract

Transient provider errors use `/fail` with `retryable: true`. PostgreSQL applies
bounded exponential backoff and reclaims expired five-minute leases. Permanent
scope, recipient, or validation failures use `retryable: false` and remain visible
for an administrator.
