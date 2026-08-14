# Hosted activation preparation

**Date:** 2026-08-14
**Milestone:** credential-ready hosted launch package

## Outcome

Completed the code-only preparation required before client-owned staging hosting.
The deployment system now has a reviewed Ubuntu VPS bootstrap, secret-free
handoff, environment-specific image/deployment gates and CI coverage for the
Windows test companion.

## Boundaries retained

- No VPS, domain, cloud account, provider credential, client record or document
  was created or changed.
- No secret is committed, printed by validation, or accepted through chat.
- PostgreSQL/Supabase remain authoritative; n8n remains a private scheduler with
  no Google or Telegram credentials.
- Staging remains mandatory before production.

## Verification

- `npm run check`: 145 tests passed, three existing tests skipped.
- `npm run host:bootstrap:validate`: Bash syntax and activation-handoff contract
  passed.
- `npm run production:validate`: staging/production image and Compose contracts
  passed using synthetic values.
- `npm run security:boundaries`: client/server secret boundary passed.
- `npm run desktop:verify`, `npm run desktop:check`, and native Rust tests passed.

`npm run release:verify` remains the final clean-checkout gate. It was not run in
this working pass because the active local server correctly occupies port 3000 and
the command rejects such a run to avoid masking a production build issue.
