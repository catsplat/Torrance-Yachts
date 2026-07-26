# Email and integration activation

This runbook turns the verified release candidate into a connected installation.
It does not grant permission to enter live client data. Complete synthetic tests
and record evidence in `/settings/launch` first.

## 1. First administrator

1. Generate a unique high-entropy value of at least 32 characters in the approved
   secret manager.
2. Set `INITIAL_ADMIN_SETUP_TOKEN` in the deployment environment and restart only
   the application container.
3. Open `/setup`, create the named administrator, then sign in normally.
4. Remove `INITIAL_ADMIN_SETUP_TOKEN` and restart the application.
5. Confirm `/setup` reports that initial setup is complete.

Do not put the token in a support message, screenshot, issue, audit note, or Git.

## 2. Account invitation and recovery email

### Local development

Supabase captures Auth invitation and recovery mail in Mailpit. Open
`http://127.0.0.1:54324` after requesting an invitation or recovery message. This
mail never leaves the development machine.

Mailpit is not the application Inbox. The application Inbox contains ingested
charter-operation email; Mailpit is only a development mailbox for Auth mail.

### Production

Configure SMTP in the approved hosted Supabase Auth project or self-hosted GoTrue
deployment. Keep credentials in provider/deployment secret storage, not in the
web interface. Test both a staff invitation and password recovery, then set
`AUTH_SMTP_CONFIGURED=true` and retain non-secret evidence in launch readiness.

## 3. Gmail ingestion

1. Create the client-owned Google Cloud project and OAuth consent configuration.
2. Grant only the scopes required by the reviewed n8n workflow.
3. Store provider credentials in n8n credential storage.
4. Configure the same high-entropy `EMAIL_INGESTION_TOKEN` for n8n and the app.
5. Enable the Gmail integration record in the application.
6. Import workflows but leave them inactive.
7. Run a synthetic set: new enquiry, follow-up, internal message, circular, and
   unrecognised message.
8. Verify classification, human review, Telegram/in-app alert materialisation,
   draft behaviour, idempotency, and failure visibility.
9. Activate the reviewed ingestion workflow explicitly.

The app cannot create a Google Cloud project or consent screen on the operator's
behalf. That boundary is intentional.

## 4. Personal Google inbox connections

1. In the client-owned Google Cloud project, create one Web OAuth application.
2. Add the exact callback URL
   `https://<approved-app-host>/api/integrations/google/callback` (or the local
   `http://localhost:3000/...` equivalent) to Google&apos;s authorised redirect URIs.
3. Store `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` only in
   deployment secret storage, then restart the application.
4. Each employee opens **Settings -> Your alerts and connections** and selects
   **Connect Google inbox**. Google, not Torrance Yachts, presents the consent
   screen.
5. Confirm the connected account appears in Settings and complete a synthetic
   internal alert before enabling the email route.

The app encrypts ongoing access in Supabase Vault and never shows a refresh token
or client secret in the interface. The granted scope permits approved inbox
routing and controlled Gmail drafts; external recipient operations do not send
mail automatically.

## 5. Telegram

1. Create one company-controlled bot with BotFather.
2. Store `TELEGRAM_BOT_TOKEN` only in deployment secret storage.
3. Set the non-secret bot username as `TELEGRAM_BOT_USERNAME` and create a
   high-entropy `TELEGRAM_WEBHOOK_SECRET` in deployment secret storage.
4. Register `https://<approved-app-host>/api/integrations/telegram/webhook` as
   the Telegram webhook with that same secret token. The endpoint must be HTTPS
   and must not be exposed through an untrusted proxy.
5. Enable the Telegram integration record.
6. Each staff member opens **Settings -> Your alerts and connections** and
   selects **Connect Telegram**, then presses Start in the company bot. The
   manual chat-ID field is only a documented recovery fallback.
7. Send a synthetic internal alert and verify pairing, delivery, and failure
   history. Confirm that a reused pairing link is ignored.

Broker, captain, booking, invoice, and status communications remain reviewable
even when Telegram is connected.

## 6. n8n

Set `N8N_HEALTH_URL` to the private `http://n8n:5678/healthz` endpoint in the
production Compose network. Import the pinned workflow definitions, run the n8n
security audit, inspect credentials/scopes, and activate workflows one at a time
only after their synthetic acceptance tests pass. PostgreSQL and application
commands remain authoritative; n8n is a scheduler and adapter worker.

## 7. AI

Development uses the deterministic local provider. Production may use the
approved OpenAI provider by setting `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and
the reviewed model in server-only configuration. Confirm the data policy before
sending email or contract text. Identity documents are excluded. AI output is a
suggestion and never books a yacht, sends consequential communications, or
changes authoritative workflow state.

## 8. Yachtfolio

Yachtfolio booked dates remain a manual named task because this project has no
approved Yachtfolio write API. The user completes the external action, supplies a
reason/evidence, and records completion in the booking. Reopening is also audited.
This is complete functionality, not a disconnected automation placeholder.

## 9. Acceptance evidence

Use `/settings/activation` for live configuration/health indicators and
`/settings/launch` for formal evidence and sign-off. Never mark a check passed
solely because a credential exists; verify the complete synthetic path and its
failure handling.
