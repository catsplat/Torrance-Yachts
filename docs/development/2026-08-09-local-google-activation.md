# Local Google activation

The local release candidate now has a real Google Cloud project configured for
credential-free staff onboarding during acceptance testing.

## Delivered

- separate least-privilege OAuth clients for application identity and Workspace
  data access;
- a test-user audience without publishing the app or enabling billing;
- Gmail, Drive, Sheets and Calendar APIs enabled for staged acceptance;
- credentials stored only in the ignored `.env.local` through a clipboard-only
  helper;
- local Supabase startup that receives the provider configuration without
  committing it;
- a verified administrator invitation followed by successful Google sign-in;
- a verified separate Workspace consent flow whose refresh token is stored in
  Supabase Vault and shown only as a connected account in the interface.
- a standalone local production launcher whose runtime logs can remain outside
  `.next`, preventing Windows file locks from blocking subsequent builds.

## Security boundary

Public registration remains disabled. A Google identity can enter the private
workspace only after an administrator invites that exact email address. Google
login grants identity details only; Gmail and Sheets access is a separate,
explicit connection performed from the signed-in account settings page.

No live mailbox ingestion, Telegram delivery or external reporting mirror was
activated during this local configuration milestone.
