# Browser acceptance

The Playwright suite proves the application boundary with synthetic data only.
It covers private access, approved administrator authentication, core route
rendering, navigation, notifications, theme switching, WCAG A/AA checks, and
the resettable five-route email rehearsal.

## Local run

1. Start Docker Desktop and local Supabase.
2. Copy `.env.e2e.example` to the ignored `.env.e2e.local` file.
3. Enter an approved local development account. Never use a live password.
4. Install browsers once with `npm run test:e2e:install`.
5. Run `npm run test:e2e`.

The suite uses port 3000 and reuses a healthy local server when present. It runs
one worker because all browser projects share one local database and the
workflow test creates and resets a run-scoped fictional scenario.

## Disposable CI run

CI starts a fresh minimal Supabase stack and runs
`ops/e2e/prepare-local-environment.mjs`. The script derives local database keys,
generates runtime-only setup values, and writes an ignored environment file. The
authentication setup project then creates the first administrator through the
same one-time application route used by a new installation.

Failure evidence is uploaded as the `browser-acceptance-report` artifact. It may
contain only synthetic fixture text, but it should still be handled as internal
engineering evidence.

## Boundaries

- No Gmail, Telegram, Calendar, Drive, Sheets, Yachtfolio, cloud AI, or live
  recipient is contacted.
- The accessibility scan catches automatically detectable violations only.
- A real macOS browser walkthrough, keyboard check, and client UAT remain launch
  acceptance gates.
