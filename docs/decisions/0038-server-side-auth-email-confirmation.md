# ADR 0038: Server-side invitation and recovery confirmation

**Status:** Accepted
**Date:** 13 August 2026

## Context

The application uses Supabase SSR clients and a server-side PKCE callback for
Google sign-in. Local Supabase invitation links, however, were using the
implicit email flow. They carried a session in a URL fragment, which a server
route cannot receive. The existing `/auth/callback` route therefore saw no
`code` and correctly treated the callback as invalid.

Supabase intentionally does not support PKCE for administrator invitations:
the recipient may accept an invitation in a different browser or on another
device from the administrator who initiated it.

## Decision

- Keep PKCE and `/auth/callback` for OAuth.
- Use Supabase Auth email templates for invitations and password recovery that
  send `{{ .TokenHash }}` to the public `/auth/confirm` route with a permitted
  `type` and safe local destination.
- Have that route call `verifyOtp` on the server, copy the resulting session
  cookies to its redirect response, then reapply the active-profile and
  explicit-access-approval check before sending the user to password setup.
- Accept only `invite` and `recovery` confirmation types. Invalid, expired or
  malformed links retain the existing recovery-invalid result.
- In production, redirect only to the configured application origin. Local
  development also accepts the two explicit loopback aliases used by the
  Supabase and browser-acceptance stacks so cookies are not lost between
  `localhost` and `127.0.0.1`.

## Consequences

- Session tokens are not placed in an email-link fragment or parsed in the
  application.
- Profile approval, RLS, mandatory MFA and normal logout remain unchanged.
- The production Supabase Auth project must use equivalent invite and recovery
  templates and must allow its exact `/auth/confirm` redirect URL.
- Email security scanners can consume one-time confirmation links. An
  administrator can safely issue a new recovery email; this is documented
  operational behaviour rather than a reason to weaken token handling.
