# 26 July 2026 - guided personal setup

## Outcome

Configuration now reflects how a charter-operations staff member thinks about
the product: where alerts should reach them, which events require their
attention, and whether their Google inbox is connected. It no longer asks an
employee to handle OAuth secrets or locate company-level automation controls.

## Implementation

- Reworked Settings into three plain-language areas: personal setup, workspace
  workflow, and company delivery/launch controls.
- Rebuilt the personal alert page around contact details, delivery routes,
  operational topics, and a visible three-step completion state.
- Added an official Google authorisation-code flow with PKCE, state validation,
  a ten-minute HttpOnly cookie, verified-account lookup, bounded timeouts, and
  encrypted Vault persistence.
- Kept Telegram explicit: it is a company bot and a private destination chat ID,
  not a third-party sign-in mechanism.
- Moved adapter configuration and n8n controls into an administrator-only
  Company connections page; the main Integrations page now focuses on approvals
  and observable delivery work.

## Verification

- ESLint completed cleanly.
- TypeScript completed cleanly.
- 88 active unit tests passed; one existing local-Ollama test remains skipped
  when no local model is available.
- A Next.js production build completed successfully and includes the new Google
  connection callback routes and company-connections settings route.

## Activation boundary

The local workspace remains disconnected from Google and Telegram. A
client-owned Google Cloud OAuth app, its exact callback URL, a synthetic mailbox
test, and formal activation evidence are still required before live provider use.
