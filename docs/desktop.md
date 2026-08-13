# Optional desktop companion

Desktop packaging is intentionally deferred until the hosted edition is accepted.
The supported design is a thin Tauri client that loads the hosted application and
may provide a loopback-only local AI bridge to an installed Ollama instance.

It must not bundle PostgreSQL, Supabase, n8n, ClamAV, production data, OAuth client
secrets, service credentials or Telegram credentials. Authentication remains the
existing Supabase flow. Windows signing and macOS signing/notarisation are required
before distribution.

Until those native acceptance gates exist, staff should install the hosted site
through their browser where supported or use it directly. This document is an
architecture boundary, not a claim that an installer has been delivered.

