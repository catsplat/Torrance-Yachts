# Optional thin desktop companion

Phase 12 validates the direction but does not place desktop packaging on the
hosted product's launch critical path.

## Approved architecture boundary

- signed Tauri shell displaying the centrally hosted application;
- narrowly scoped, loopback-only bridge for an optional installed Ollama model;
- authenticated pairing and strict origin/request validation;
- encrypted operating-system credential storage;
- no PostgreSQL, Supabase, n8n, ClamAV, operational documents, or server
  credentials on the employee computer;
- Windows installer and signed/notarised macOS package only after hosted
  production is stable.

## Why it is deferred

- the principal employee uses macOS, so a Windows-only executable is insufficient;
- the hosted application and managed database must be accepted first;
- the local bridge needs explicit pairing, origin, request-size, and model
  allow-list controls before it may process operational content;
- Apple notarisation, Windows signing, updates, rollback, and clean-machine
  installation require separate native acceptance.

The hosted release remains the supported first production version. This document
prevents the desktop option from being forgotten or misrepresented as a trivial
file-conversion task.
