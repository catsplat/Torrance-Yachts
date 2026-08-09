# Threat model and data-flow inventory

**Scope:** shared application before hosting or desktop packaging
**Reviewed:** 9 August 2026
**Data rule:** PostgreSQL is authoritative; providers receive only the minimum
data required for an approved adapter operation.

## Assets

- staff identities, sessions, MFA factors and access approvals;
- email bodies, sender details and AI review evidence;
- enquiries, offers, bookings, tasks, availability and payments;
- passports, KYC/CDD material, agreements and invoices;
- Google refresh tokens, Telegram destinations and server credentials;
- audit events, provider delivery history, backups and recovery evidence.

## Trust boundaries and flows

| Flow | Data crossing the boundary | Entry control | Consequential result |
| --- | --- | --- | --- |
| Browser -> application | session cookies, forms, uploads | verified Supabase claims, active approved profile, AAL2, Zod validation, throttling | authorised application/SQL command only |
| Google sign-in -> Auth | identity assertion | configured OAuth client plus internal access approval | unapproved identities reach only Access pending |
| Google Workspace -> application | OAuth code, Gmail history/messages, draft/Calendar/Drive/Sheets responses | PKCE, short-lived state, trusted origin, encrypted Vault token, timeouts | inbox data or reconciled mirror state |
| Gmail -> inbox | headers and message text | history reconciliation, payload limits, immutable provider IDs | idempotent message and advisory review work |
| Application -> AI | bounded email text or selected contract clauses | prompt-injection boundary, safety identifier, provider deadline, schema/evidence validation | review proposal only |
| Application -> Telegram | sender, classification, summary, confidence, secure link | server bot token, approved user destination, outbox idempotency | notification only; approval occurs in the signed-in app |
| Browser -> document quarantine | fictional/approved business file | size/concurrency limit, signature/MIME check, SHA-256, private bucket | quarantined object only |
| Quarantine -> ClamAV -> private storage | file bytes and verdict | INSTREAM adapter, timeout, immutable infected decision | release only after clean result |
| PostgreSQL -> n8n | scheduler token and bounded work result | constant-time secret check, throttling, worker allow-list | scheduler invocation; no business authority or provider credential |
| PostgreSQL -> Calendar/Drive/Sheets | approved mirror payload | selected encrypted Google connection, stable idempotency key | one-way mirror; database remains authoritative |
| Backup tooling -> off-site store | encrypted database and private objects | operator-held encryption, checksum and retention controls | recoverable copy, never a live data source |

## Principal threats and controls

### Unapproved or stolen account

- New Google identities are inactive and unapproved by default.
- One approved-user guard checks verified claims, profile status and role close
  to data/actions.
- Every staff account requires TOTP AAL2; Google sign-in does not bypass it.
- Administrator factor reset requires another administrator, a reason and an
  audit event.

Residual risk: compromise of both factors or an administrator. Production adds
Cloudflare Access, account alerts and the documented recovery process.

### Broken access control

- RLS and security-definer commands enforce business permissions.
- Server actions and route handlers recheck identity/role at execution time.
- Administrator pages redirect before loading administrator data.
- Browser projects exercise unauthenticated, unapproved, staff and
  administrator identities.

### Duplicate, missed or reordered work

- Provider message IDs, Gmail history cursors and delivery idempotency keys are
  durable.
- PostgreSQL claims leased batches, recovers expired leases, caps retries and
  exposes permanent failure.
- Availability exclusion constraints and transactional task generation prevent
  duplicate reservations/workflows.

### Malicious email or AI output

- Email content is treated as untrusted data, never instructions.
- AI output must match schemas and exact source evidence.
- AI cannot create offers/bookings, reserve dates, send mail or release files.
- Humans correct, reject or explicitly approve proposals in the application.

### Malicious or sensitive documents

- Quarantine is physically separate from released private storage.
- Signature/MIME/active-content checks and ClamAV precede release.
- Signed URLs, verification, workflow completion and Drive mirroring are blocked
  until release.
- No real identity documents are permitted before retention and scanning UAT.

### Credential or personal-data disclosure

- Secrets stay in ignored environment files or Supabase Vault and remain
  server-only.
- n8n stores no Google or Telegram credentials.
- Audit JSON redacts content, token, secret, password, identity, bank, payment,
  email, phone and address keys.
- Health/status contracts return state and safe summaries, not credential
  values or message bodies.
- Release reports contain test labels/counts only.

### Resource exhaustion

- Setup, login, OAuth, uploads and automation routes are throttled.
- Uploads have per-file, hourly and concurrent limits.
- Gmail, AI and outbox workers use bounded batches, concurrency, leases and
  deadlines.
- Register queries use cursor pagination and indexed server-side filters.

## Logging and incident evidence

Application logs may contain request/event/rehearsal identifiers, route,
duration, status, safe error code and queue metrics. They must not contain email
bodies, OAuth/access tokens, identity-document contents, bank/payment details or
private contact values. Provider errors shown to users are reduced to an
operator-safe category. Audit records retain redacted before/after values and
reasons for consequential decisions.

Any suspected disclosure follows `docs/operations/INCIDENT_RESPONSE.md`: stop
integrations, preserve evidence, revoke/rotate credentials, determine affected
records, restore if necessary and record client-approved follow-up.

## Deployment risks intentionally deferred

Network ingress, Cloudflare Access policy, production SMTP, off-site backup,
provider consent, live monitoring and staff UAT are deployment/client gates.
They are not represented as accepted by local synthetic tests.
