# Integration adapter contract

All automation endpoints require `Authorization: Bearer
<AUTOMATION_SHARED_SECRET>`. n8n receives this application scheduler secret only;
it receives no Google, Telegram, AI, document, or business credentials.

## Automation tick

`POST /api/integrations/automation/tick`

The tick reconciles the administrator-selected Gmail inbox, claims a bounded AI
batch, creates due internal notifications and refreshes authoritative calendar
records. Gmail history is the only production inbox ingestion path. The first
reconciliation records the current cursor rather than importing old mail; an
expired cursor uses one bounded recovery query.

AI jobs use database leases, retry caps, provider and overall deadlines, and an
approved staff owner. Output remains evidence-backed review work. It cannot
create an offer, booking, reservation, or sent message.

## Staff delivery

`POST /api/integrations/automation/dispatch-alerts`

The application claims and delivers a bounded batch of internal Telegram
alerts, employee email alerts, and approved external Gmail drafts. It refreshes
the appropriate Vault-held Google token internally. External email is created as
a Gmail draft only.

## Google Workspace mirrors

`POST /api/integrations/automation/dispatch-google-workspace`

The application claims `calendar_upsert`, `drive_upload`, and `sheets_snapshot`
deliveries. It refreshes the selected Vault-held Google connection, uses bounded
timeouts, and records verified completion or redacted failure.

- Calendar uses stable internal identifiers, private visibility, and no attendees.
- Drive accepts only released clean documents and checks idempotency before copy.
- Sheets replaces controlled reporting tabs with immutable row identifiers and
  formula-safe raw values.

## Delivery leases

The database claim, completion, and failure commands remain the authority. A
claim includes a worker ID and bounded limit. Completion records the provider
identifier. Failure records a redacted code/message and whether retry is safe.
Lease expiry, exponential back-off, retry caps, and permanent-failure visibility
are enforced by the database contract.

No endpoint accepts a provider token from n8n, and no error payload may include
message bodies, private contacts, invoice details, identity data, or secrets.
