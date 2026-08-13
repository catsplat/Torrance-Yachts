# Server-side Auth email confirmation

**Date:** 13 August 2026
**Milestone:** local authentication correction

## Change

Replaced the incompatible implicit-fragment invitation path with a server-side
Supabase `verifyOtp` confirmation route. Invitation and recovery templates now
contain a one-time token hash and an allowed confirmation type; the route
creates the cookie-backed session before redirecting to password setup.

## Evidence

- Reproduced the prior local invitation behaviour: Mailpit delivered a valid
  link, Supabase confirmed the account, and the implicit session fragment left
  the server callback without a PKCE code.
- Added a browser acceptance flow using a unique `example.test` identity.
- The flow proves invitation, password update, ordinary password login, MFA
  routing, recovery email, recovery password update and invalid-link handling.
- Lint, strict TypeScript, and unit tests passed alongside the focused browser
  acceptance project.

## Boundaries retained

This change does not approve uninvited users, relax MFA, bypass RLS, use a
service key in the browser, or put email tokens in source control or logs.
