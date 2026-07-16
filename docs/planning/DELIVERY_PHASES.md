# Delivery phases

**Programme baseline:** 15 July 2026

The first complete production release is divided into twelve dependency-aware vertical slices. Each phase must pass its own security, testing, documentation, and acceptance gates before the next phase is merged.

| Phase | Outcome | Status |
| ---: | --- | --- |
| 1 | Application foundation, responsive internal dashboard shell, repository standards, CI, and portfolio/audit structure | Released as `v0.1.0` |
| 2 | Individual authentication, database-authorised users, yacht register, and yacht audit history | Released as `v0.2.0` |
| 3 | Canonical contacts, companies, and yacht-specific operational/notification responsibilities | Released as `v0.3.0` |
| 4 | Manual enquiry pipeline with linked contacts/yachts, controlled states, notes, history, events, search, and real dashboard counts | Released as `v0.4.0` |
| 5 | Yacht commercial profiles, seasonal rates, approved sales materials, versioned offer templates, and reviewable offers | Released as `v0.5.0` |
| 6 | Human-confirmed bookings, charter periods, 24-hour availability buffers, conflict detection, and Yachtfolio action tracking | Released as `v0.6.0` |
| 7 | Configurable task templates, dependencies, generated booking checklists, reminders, assignees, and completion/reopening audit | Released as `v0.7.0` |
| 8 | Private document storage, booking document requirements, contract-field review, payment schedules, and deterministic commission calculations | Released as `v0.8.0` |
| 9 | Idempotent Gmail ingestion, message/thread storage, deterministic routing, manual classification, follow-up association, and configurable inactivity timeouts | Released as `v0.9.0` |
| 10 | Provider-neutral AI extraction, classification, summaries, yacht-specific drafts, and editable KYC/follow-up templates with confidence, source evidence, correction, and human approval | Released as `v0.10.0` |
| 11 | Central notifications plus Telegram, calendar, Google Drive/Sheets, n8n, invoice PDF generation, and controlled external-system adapters | Released as `v0.11.0` |
| 12 | Production hosting, backups and restore test, monitoring, security/privacy review, guided tutorial and isolated synthetic practice workflow, staff acceptance, migration, training, and launch | Planned |

## Interpretation

- Phase count is a delivery map, not a claim that every phase has equal effort.
- Eleven of twelve phases are released. Production activation, packaging validation, security/backup acceptance, tutorial, training, and launch remain.
- The dashboard is upgraded incrementally as real records become available; final operational reporting and polish are completed in Phase 12.
- No later integration becomes a source of truth. PostgreSQL remains authoritative throughout.
- AI is deliberately Phase 10: it assists a workflow that is already functional and testable without AI.

## Current critical path

```text
Manual enquiries
  -> commercial profiles and offers
  -> confirmed bookings and availability
  -> workflow tasks
  -> documents and payments
  -> email intake
  -> AI assistance
  -> external integrations
  -> production launch
```

This order proves the business rules before automating them and keeps consequential actions under human control.
