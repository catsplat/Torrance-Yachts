# 26 July 2026 - local offline assurance milestone

## Objective

Prove the operational workflow locally before activating any provider or using
any client data.

## Implemented

- administrator-only, development-only synthetic email rehearsal controls;
- five fictional routes: new enquiry, follow-up, internal, circular, unknown;
- stable provider event identifiers and a replay control for ingestion
  idempotency;
- local Ollama structured analysis with JSON mode, explicit response shape,
  strict Zod validation, a 60-second failure boundary, and no cloud key;
- a visible fictional charter rehearsal map using seeded M/Y Asteria records;
- imported inactive local n8n workflows and the narrow development delivery
  simulator, then completed its exact loopback claim/complete contract without
  an external provider; and
- explicit document quarantine/scanning production gate.

## Evidence recorded in code and checks

- email ingestion and AI database tests cover replay/idempotency, deterministic
  routes, review state, correction/rejection, and private attachment metadata;
- booking, task, document, payment, availability-buffer, cancellation,
  amendment, dependency, outbox, retry, permanent-failure, and recovery paths
  have PostgreSQL behaviour tests;
- the local Ollama acceptance test uses only fictional content and confirms a
  schema-valid `new_enquiry` result; and
- imported n8n workflows are inactive by default. The simulator has only a
  manual trigger and application claim/complete calls. The n8n editor is the
  supported way to start the manual simulator; `n8n execute` cannot be launched
  inside the already-running task-broker container.

## Operator walkthrough

1. Sign in with the local development administrator.
2. Open **Settings -> Offline workflow rehearsal**.
3. Create the five-route suite, open the fictional new enquiry, and generate an
   AI-assisted review.
4. Review/correct or reject the proposal; do not treat it as authority.
5. Follow the rehearsal map through offer, booking, documents, tasks, payments,
   calendar, notifications, cancellation/amendment, and audit history.
6. Use only fictional files and retain the result as local evidence.
7. For a deliberately clean local database, stop the app and run `npm run
   db:reset`; this deletes local synthetic records and is never a production
   procedure.
