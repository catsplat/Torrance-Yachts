# Google account and Workspace connection

## Decision

Staff use familiar Google screens. They never copy an OAuth client secret,
refresh token, Gmail password, or Google Sheets key into Torrance Yachts.

Two deliberately separate permissions exist:

1. **Continue with Google** signs an approved employee into the private
   Torrance Yachts application.
2. **Connect Google Workspace** in Settings grants that signed-in employee
   access to the Gmail account and Google Workspace resources they choose.

Separating the two means an employee can use Google to sign in without silently
granting access to their mailbox. It also keeps the application identity and
the operational inbox connection independently revocable.

## One-time administrator setup

The company administrator creates a single Google OAuth web application and
configures its server-only client ID and secret in Supabase Auth / deployment
secret storage. They then enable `GOOGLE_SIGN_IN_ENABLED=true`.

The required OAuth callback locations are:

- Supabase Auth callback for **Continue with Google**, supplied by the
  Supabase project configuration.
- `<APP_BASE_URL>/api/integrations/google/callback` for **Connect Google
  Workspace**.

No value from this setup is shown to staff or committed to the repository.

## Staff experience

1. An administrator approves the staff account.
2. The staff member selects **Continue with Google** or signs in with their
   existing private application password.
3. In **Settings → Your alerts and connections**, they select **Connect Google
   Workspace**, choose the desired Google account, and approve the clearly
   displayed Gmail / Sheets permissions on Google's page.
4. The platform stores the ongoing connection encrypted in Vault. The employee
   can disconnect it at any time with an audited reason.

The granted Sheets scope prepares the controlled reporting mirror. PostgreSQL
continues to be the operational source of truth; a connected Sheet is never
allowed to create or alter bookings directly.

## Security boundary

Google sign-in is not public registration. `enable_signup=false`, the inactive
profile check, and the callback sign-out rule ensure that an unapproved Google
account cannot enter the private workspace. An administrator must activate the
matching staff profile before that person can proceed.
