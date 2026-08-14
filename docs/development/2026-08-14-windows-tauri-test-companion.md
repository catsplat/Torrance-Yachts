# Windows Tauri test companion

**Date:** 2026-08-14
**Milestone:** local native shell preparation

## Outcome

Added a minimal Tauri 2 Windows companion that is intentionally a native frame
for the existing local web application rather than a second product. It uses a
fixed loopback health check and strict navigation allow-list, ships no application
data or services, and targets a per-user unsigned NSIS installer for this
developer-machine test.

## Deliberate boundaries

- No local service provisioning, data migration or credential handling.
- No new native permissions or Tauri plugins.
- No automatic updates, cloud links or configurable remote URL.
- Existing Next.js authentication and local Ollama handling stay unchanged.
- Google OAuth remains in the ordinary browser pending a dedicated native callback
  design. The desktop user agent now lets the web login show that boundary
  clearly instead of presenting a non-functional Google control.

## Verification performed

- `npm run desktop:verify` confirmed the fixed URL, NSIS/current-user target,
  absence of updater/plugins, constrained Cargo features and static fallback.
- `npm run desktop:check` and `cargo test --manifest-path src-tauri/Cargo.toml`
  compiled the native shell and passed its two navigation allow-list tests.
- The regular local web gate (`npm run check`) passed with 144 tests and no lint
  or TypeScript errors.
- `npm run desktop:build` produced the unsigned x64 NSIS setup executable.
- The installed release executable started successfully through its generated
  Start Menu shortcut while `/api/health/live` was available.
- A silent current-user install and uninstall both exited successfully. The Start
  Menu shortcut and uninstall registration were removed afterwards, and the local
  Docker volume list was unchanged.

The stopped-workspace fallback page has not been manually displayed in this pass:
the active local application was intentionally left running so it did not disrupt
the developer's current signed-in work. Its fixed health boundary and bundled-page
route are verified by the Rust/configuration tests. The full `release:verify`
command was also left for a clean, port-3000-free checkout because its own safety
contract correctly rejects a running local server.
