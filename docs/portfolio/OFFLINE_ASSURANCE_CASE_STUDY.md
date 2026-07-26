# Offline launch assurance case study

## Problem

The product needed to support a high-consequence charter workflow while the
client had not yet chosen hosting or connected any provider account. A polished
demo that skipped production boundaries would have hidden the most important
risks: duplicate provider events, unsafe AI automation, document handling, and
background delivery failures.

## Approach

The local assurance programme uses a fictional M/Y Asteria charter scenario,
synthetic `example.test` messages, local Supabase, local n8n, and local Ollama.
Fixtures cross the real validation and ingestion boundary. The workflow then
uses the normal human-approved enquiry, offer, booking, task, document, payment,
calendar, and outbox commands.

## Controls demonstrated

- Five deterministic email routes plus review-required unknown mail.
- Stable provider-event replays that cannot duplicate operational records.
- Schema-validated AI proposals with evidence, correction, rejection, retry,
  timeout, and malformed-output failure handling.
- Buffered yacht availability, dependency-aware tasks 0.A-7, payment schedule,
  invoice, Yachtfolio task, cancellation, amendment, and follow-up paths.
- Private document validation and signed URLs, while real identity files remain
  blocked pending a selected scanning/quarantine service.
- n8n as a loopback-only adapter/scheduler, never the business source of truth.

## Sanitised demonstration capture checklist

Before publishing portfolio material, capture only the following with all local
URLs, example.test addresses, IDs, paths, keys, and browser chrome redacted:

1. Offline workflow rehearsal page with its development-only warning.
2. Fictional email review showing proposal/evidence and the human decision.
3. Buffered availability/conflict view for the seeded yacht.
4. Task dependency view and private-document verification state.
5. Integrations/outbox failure and recovery view.
6. Final checks screen showing no live provider configured.

Never include a login screen, Supabase Studio, `.env` values, a database URL,
any operational secret, a real person, or an identity document in a portfolio
capture.
