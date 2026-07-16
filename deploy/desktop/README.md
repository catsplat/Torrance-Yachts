# Secondary local desktop distribution

Phase 12 validates the direction but does not place desktop packaging on the
hosted product's launch critical path.

## Feasible architecture

- signed Tauri or Electron shell displaying the existing local web UI;
- managed local PostgreSQL/Supabase-compatible services;
- managed local n8n worker;
- application-owned data and document directory;
- encrypted operating-system credential storage;
- optional Ollama provider;
- encrypted export and restore;
- Windows installer and signed/notarised macOS application package.

## Why it is deferred

- the principal employee uses macOS, so a Windows-only executable is insufficient;
- bundled mutable business data cannot safely live inside one portable executable;
- Gmail, Telegram, Google Calendar, Drive, and Sheets still need internet and
  OAuth even when the core application is local;
- scheduled work stops when the computer is off;
- signing, notarisation, auto-update, database upgrades, and backup recovery need
  separate acceptance work.

The hosted release remains the supported first production version. This document
prevents the desktop option from being forgotten or misrepresented as a trivial
file-conversion task.
