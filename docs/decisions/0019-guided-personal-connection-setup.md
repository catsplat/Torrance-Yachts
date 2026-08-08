# ADR 0019: Guided personal connection setup

**Status:** Accepted

## Context

Personal alert settings previously exposed Gmail OAuth client IDs, client
secrets, refresh tokens, and scope strings to each staff member. Although the
values were encrypted correctly, this made a normal setup task look like an
administrator or developer task and invited unsafe credential handling.

The product is a private charter-operations workspace. Staff need a clear way
to set their operational contact details, Telegram destination, and Google
inbox without being asked to understand OAuth implementation details.

## Decision

- Settings is divided into personal setup, workspace workflow, and company
  delivery/launch controls.
- Each staff member uses **Settings -> My account and alerts** for their phone
  number, alert email, Telegram pairing, delivery topics, and Google account.
- A company administrator configures one Google OAuth application only in
  server-side environment configuration. The application uses Google OAuth
  authorisation-code flow with PKCE and a short-lived HttpOnly state cookie.
- Google consent happens on Google&apos;s domain. The application receives an
  offline refresh token, identifies the verified Google account, and stores the
  connection in Supabase Vault using the existing audited credential command.
- The granted scope is limited to identity/email, Gmail read, Gmail modify for
  approved inbox routing, Gmail compose for controlled drafts, spreadsheet
  access, and Drive metadata used only to list spreadsheet names. It does not
  request automatic Gmail sending authority.
- After consent, an administrator chooses the reporting spreadsheet by name
  from resources returned by Google. The server verifies the selection before
  storing its immutable file ID; staff never copy a Sheet ID or API key.
- Telegram remains a company-bot pairing rather than a misleading "Telegram
  sign in". Staff open the company bot and press Start; the chat ID is captured
  by the pairing flow rather than typed into Settings.
- The Integration page is a daily delivery centre. Company adapter controls now
  live under administrator-only **Settings -> Company connections**.

## Consequences

- Staff never paste OAuth client secrets or refresh tokens into the application.
- A Google OAuth consent screen and exact callback URL still need to be created
  in a client-owned Google Cloud project before the connection button becomes
  available.
- PostgreSQL remains authoritative. The selected Sheet is a one-way reporting
  target and cannot create or alter bookings.
- Existing encrypted credential records and disconnect/audit controls remain
  compatible with the managed consent flow.
