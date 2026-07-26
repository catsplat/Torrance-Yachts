# 26 July 2026 - Telegram staff pairing

## Outcome

Staff can now connect their private Telegram destination through a normal
company-bot flow rather than locating a raw chat ID. The previous manual field
remains available only as a recovery fallback.

## Safety design

- Pairing links use 256 bits of server-generated randomness and expire after ten
  minutes.
- Only a SHA-256 hash is persisted; the raw payload is not written to a table,
  event, or log.
- The inbound webhook requires Telegram&apos;s secret token header, accepts only a
  bounded `/start ty_…` command, and cannot invoke ordinary application actions.
- Database commands enforce active staff, private request rows, one-time
  consumption, service-role-only webhook completion, RLS, and a durable audit
  event.
- A consumed or expired link is harmlessly ignored, making provider retries
  idempotent.

## Verification

- 623 PostgreSQL permission and behaviour checks pass, including the new
  pairing request, restricted-table, unauthorised-completion, successful
  completion, auto-enable, invalid-payload, and replay assertions.
- 91 active application unit tests pass, including deep-link construction,
  command parsing, and token hashing.
- ESLint, TypeScript, database lint, and a Next.js production build complete
  cleanly.

## Activation boundary

No bot or webhook has been activated. A future client-owned Telegram bot needs
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and
`TELEGRAM_WEBHOOK_SECRET` in protected environment configuration, followed by
an HTTPS webhook registration and synthetic acceptance test.
