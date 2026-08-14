# Windows local test companion

The first desktop deliverable is a deliberately thin, unsigned Windows Tauri 2
test shell. It opens only the locally running workspace at
`http://127.0.0.1:3000`; it is not a standalone desktop edition and it is not a
client-distribution installer.

## What it does

- Performs one bounded request to `/api/health/live` on the fixed loopback
  address when it starts.
- Opens the existing Next.js application in the native WebView when the local
  workspace is healthy.
- Shows a bundled startup page with the three local startup steps when the
  workspace is not running.
- Allows navigation only to bundled `tauri://localhost` content and the fixed
  `127.0.0.1:3000` workspace address.
- Uses the existing password sign-in and the existing Next.js AI/Ollama route.
- Clearly identifies its WebView to the application so the login screen presents
  the supported password route rather than a Google OAuth control that cannot
  safely complete in this first shell.

## What it deliberately does not do

It does not bundle or start Docker, Supabase, PostgreSQL, n8n, ClamAV, Ollama,
credentials, client data, a second backend, an updater, or native filesystem,
shell, process or notification permissions. It neither accepts a configurable
remote address nor launches external web content. Google sign-in and Google OAuth
remain browser-based until a separate native callback design is accepted. An
administrator must still invite the exact Google email address before that user
can sign in through the browser; `signup_disabled` is the correct response for
an unprovisioned identity and must not be worked around by enabling public signup.

## Local test instructions

Prerequisites are Node 24/npm 11.6.2, Docker Desktop, the Rust MSVC toolchain,
Visual Studio C++ tooling and Windows WebView2.

```powershell
npm run db:start
npm run dev
npm run desktop:dev
```

Build the unsigned, per-user NSIS installer with:

```powershell
npm run desktop:build
```

The installer is written below
`src-tauri/target/release/bundle/nsis/`. It creates a Start Menu entry and
uninstaller for the current Windows user only. Windows SmartScreen may warn
because no code-signing certificate is configured. Do not distribute this test
installer to a client or use it with live business data.

Before recording an internal test milestone, run:

```powershell
npm run desktop:verify
npm run desktop:check
cargo test --manifest-path src-tauri/Cargo.toml
```

The eventual hosted/native companion, macOS package, browser-to-native OAuth
callback, local Ollama bridge, signed installers, updates and distribution retain
their separate acceptance gates.
