# Live activation and client acceptance script

## Purpose

Use this document after the client has chosen hosting and supplied a dedicated
test mailbox and Telegram test chat. It validates the real adapters without
using a real broker, charterer, passport, contract, booking, or commercial term.

Do not activate a provider until the preceding section has passed and evidence
has been recorded in **Settings -> Launch readiness**.

## What the client must decide first

1. Hosted topology and account owners: production Supabase project, Linux VPS,
   domain, DNS owner, n8n owner, and backup destination.
2. Which staff members will use the system and who is the administrator.
3. Company-controlled Gmail mailbox, Telegram bot, and one internal test chat.
4. Google project/OAuth ownership and the minimum approved scopes.
5. AI provider/data policy, budget alert, and whether real email text may leave
   the selected environment.
6. Document scanning/quarantine and retention policy before real files are
   permitted.

## Staged acceptance

### 1. Access and recovery

- Create the first administrator through the one-time setup process.
- Invite one staff test account and complete password recovery.
- Confirm staff cannot edit provider configuration or other users' settings.
- Confirm the administrator can deactivate the test account and audit the
  change.

### 2. Gmail inbox

Use five messages from `example.test` addresses only:

1. New yacht enquiry.
2. Reply in the same thread.
3. Internal operations note.
4. Newsletter with mailing-list headers.
5. Unknown message requiring review.

For each, verify a single inbox record, correct route, audit entry, and no
duplicate result after a provider retry. Confirm an AI proposal is reviewable,
not authoritative; correct or reject one deliberately.

### 3. Telegram and Gmail draft delivery

- Configure the company bot only in protected server/n8n credential storage.
- Each staff tester enters only their own Telegram chat ID in **My alerts and
  connections**.
- Send one internal synthetic alert and check delivery history.
- Force one transient failure and use the retry control.
- Approve one fictional broker communication and confirm that Gmail creates a
  draft only. Verify no email is automatically sent.

### 4. Fictional charter workflow

Starting from the approved synthetic enquiry, complete the operational sequence:

1. Offer and human approval.
2. Contract-review simulation with fictional data.
3. Booking confirmation and 24-hour availability buffer.
4. Document requirement, rejection, replacement, and verification states.
5. Tasks 0.A through 7, including dependency blocking and a payment reminder.
6. Invoice PDF, calendar records, Yachtfolio manual completion, charter
   start/end, and broker follow-up.
7. Booking amendment, conflict rejection, and cancellation.

### 5. Recovery and sign-off

- Review a failed delivery, identify its recipient class and reason, then use
  the safe retry/recovery flow.
- Complete a backup/restore drill in an isolated environment.
- Confirm that disabling an integration stops new external delivery while
  preserving authoritative booking data.
- Record attendees, date, release commit, defects, waived items, support owner,
  recurring costs, and the go-live decision in Launch readiness.

## Go-live rule

Go live only after every required check is evidenced, the client accepts the
remaining policies in writing, and a named employee can complete the workflow
without developer intervention.
