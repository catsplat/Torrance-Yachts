# ADR 0041: Windows Tauri local test shell

**Status:** Accepted for developer-machine testing only
**Date:** 2026-08-14

## Context

The shared web application is the operational product and remains responsible for
data, authentication, business rules, integrations and AI-provider calls. A
Windows executable is useful for testing a native workspace experience before a
full desktop product is justified, but a packaged database/automation stack would
introduce unnecessary data, recovery, OAuth and support risk at this stage.

## Decision

Provide an unsigned Tauri 2 NSIS installer that opens only the already-running
local application at `http://127.0.0.1:3000`.

The shell performs a bounded health request to `/api/health/live` on startup. If
the request fails, it opens a bundled static page with local startup instructions.
The window rejects every main-frame navigation except bundled application content
and the fixed loopback URL. No Tauri plugins, updater, custom commands, shell,
filesystem, process, notification, arbitrary-network or credential features are
enabled.

The installer is Windows x64, NSIS and `currentUser` only. The generated product
is intentionally unsigned and carries a SmartScreen warning risk; it is a
developer-machine test artefact, not a release to staff or clients.

## Consequences

- The companion cannot work unless Docker/Supabase and the local Next.js server
  are started independently.
- It cannot alter Docker volumes, database records, Ollama models, credentials or
  application data because it owns none of them.
- Existing password authentication works unchanged. The shell identifies its
  WebView so the login page presents password sign-in rather than a broken Google
  control. Google OAuth is explicitly excluded from the native test flow until a
  safe native callback mechanism is designed.
- A future hosted/native desktop companion must undergo its own signing,
  update, macOS, backup/restore, local-service, OAuth and distribution review.
