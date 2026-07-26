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
- Each staff member uses **Settings -> Your alerts and connections** for their
  phone number, alert email, Telegram chat ID, delivery topics, and Google
  inbox.
- A company administrator configures one Google OAuth application only in
  server-side environment configuration. The application uses Google OAuth
  authorisation-code flow with PKCE and a short-lived HttpOnly state cookie.
- Google consent happens on Google&apos;s domain. The application receives an
  offline refresh token, identifies the verified Google account, and stores the
  connection in Supabase Vault using the existing audited credential command.
- The granted scope is limited to identity/email, Gmail read, Gmail modify for
  approved inbox routing, and Gmail compose for controlled drafts. It does not
  request automatic sending authority.
- Telegram remains a company-bot destination configuration, not a misleading
  "Telegram sign in". The interface explains that staff start the company bot
  once and provide their private chat ID.
- The Integration page is a daily delivery centre. Company adapter controls now
  live under administrator-only **Settings -> Company connections**.

## Consequences

- Staff never paste OAuth client secrets or refresh tokens into the application.
- A Google OAuth consent screen and exact callback URL still need to be created
  in a client-owned Google Cloud project before the connection button becomes
  available.
- A connected mailbox does not enable automatic external email, bookings,
  availability changes, or other consequential work. Those remain reviewed
  workflow actions.
- Existing encrypted credential records and disconnect/audit controls remain
  compatible with the managed consent flow.
