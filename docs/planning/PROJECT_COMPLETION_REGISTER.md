# Project completion register

**Reviewed:** 9 August 2026
**Candidate:** v0.19.0 pre-deployment release

This register distinguishes code, automated proof, local human acceptance,
client acceptance, and live provider acceptance. A phase number or successful
build is not evidence of a live service.

## Implemented and automatically verified

| Capability | Evidence boundary |
| --- | --- |
| Access | Approved active accounts, administrator/staff roles, mandatory TOTP AAL2, pending-access isolation, rechecked sensitive commands, RLS and audit history |
| Registers | Cursor pagination, database search/filter/sort/count contracts, URL state, stable cursors and 10,000-record discoverability tests |
| Daily workflow | Inbox review, stale enquiries, offers awaiting action, booking preparation, overdue payments and post-charter follow-up views |
| Email and AI | Application-owned Gmail history reconciliation; idempotent five-route ingestion; leased AI queue with evidence, confidence, corrections, rejection, deadlines and permanent-failure visibility |
| Enquiries to bookings | Controlled enquiry/offer state, signed-contract review, 24-hour buffer, conflicts, amendments, cancellation and human booking confirmation |
| Task sequence | Exact dependency-aware sequence 0.A-7, dates, reminders, notes, ad-hoc work, completion/reopen evidence and Yachtfolio manual boundary |
| Documents and finance | Private quarantine/release stores, signature/MIME/size/hash validation, ClamAV states and recovery, requirements, reviewed contract facts, one-to-three instalments and deterministic invoice PDF |
| Alerts and mirrors | Personal alert routes; Telegram and Gmail draft adapters; one-way Calendar, Drive and Sheets mirrors; transactional outbox retries and reconciliation |
| Operations | Aggregate health, redacted audit register, business-readiness report, backup/export tooling, disposable restore drill, incident/maintenance/privacy runbooks |
| Acceptance | Administrator, staff, unapproved-user, MFA, mobile-review, workflow, keyboard and axe coverage across Chromium, Firefox and WebKit using fictional records |

PostgreSQL remains authoritative. AI cannot create offers, bookings,
reservations, or sent messages. n8n stores no Google or Telegram credentials and
contains no business rules.

## Locally accepted

The resettable fictional workflow has been exercised through enquiry, offer,
booking, availability, documents, payments, invoice, Yachtfolio evidence,
charter completion and broker follow-up. The clean `npm run release:verify`
result is the release evidence for v0.19.0; its sanitized report is generated at
`.artifacts/release-verification.json`.

## Intentionally separate from the hosted first release

- Desktop installers, signing, update/rollback and fresh-machine packaging.
- SMS/WhatsApp providers.
- Direct Yachtfolio API automation (no supported approved API is in scope).
- Public/open-source publication of the private business repository.

## Human/client gates still required

1. Approve hosting, monthly budget, named system/recovery owners and support.
2. Supply client-owned Supabase/VPS/domain/Cloudflare configuration.
3. Approve staff identities, roles, MFA recovery and production Auth email.
4. Create/approve Google and Telegram owner accounts, scopes and recipients.
5. Approve yachts, rates, templates, contacts, invoice profile and routing.
6. Approve the AI provider/data terms and the KYC/passport retention policy.
7. Accept production scanning, encrypted off-site backup, monitoring and restore.
8. Complete staff training, macOS UAT and formal launch sign-off.

No live email, identity document, commercial term, private contact or recipient
may enter the system until the relevant gates record evidence in Settings >
Launch.
