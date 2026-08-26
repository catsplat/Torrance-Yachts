# Google Workspace activation

This is the activation checklist for the hosted private pilot. The application
owns the OAuth flow and stores only the encrypted refresh credential; n8n does
not receive Google credentials.

## OAuth client

Create a **Web application** OAuth client in the client-owned Google Cloud
project. Add this exact authorised redirect URI:

```text
https://torrance-yachts-app.tailaeae21.ts.net/api/integrations/google/callback
```

The local development redirect remains:

```text
http://localhost:3000/api/integrations/google/callback
```

The client ID and secret must be entered on the VPS runtime environment only:

```text
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_SIGN_IN_ENABLED=false
```

`GOOGLE_SIGN_IN_ENABLED` controls Supabase login with Google. It is separate
from the application-owned Google Workspace connection used for Gmail, Drive,
Calendar and Sheets.

## APIs to enable

Enable these APIs in the same Google Cloud project:

- Gmail API
- Google Calendar API
- Google Drive API
- Google Sheets API
- Google People API (only if the consent screen requires it; the application
  uses OpenID Connect userinfo for the account email)

The application requests these scopes during the connection flow:

- `openid`, `email`
- Gmail read/modify/compose
- Calendar events
- Drive file and metadata-readonly
- Sheets

The first connection must be made by the intended mailbox owner. Google will
show the complete consent screen; approve only after checking that the client
project and redirect URL are correct.

## Acceptance

After the environment is updated and the app restarted:

1. Open **Settings → Alerts and connections → Connect Google**.
2. Complete consent with the intended Gmail account.
3. Confirm the account appears as connected for that user only.
4. Run the Gmail synthetic inbox test and verify one message is ingested.
5. Approve one fictional reply and confirm a Gmail draft is created, never sent.
6. Select the approved Calendar, Drive and Sheets destinations and run each
   mirror test.

If Google reports that the app is unverified, restrict the OAuth consent screen
to the client’s internal test users while the pilot is being accepted. Do not
put client secrets in Git, chat, browser storage or n8n.
