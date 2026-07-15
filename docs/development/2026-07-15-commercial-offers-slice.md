# Phase 5 development diary: commercial profiles and offers

**Started:** 15 July 2026

## Objective

Prove the manual commercial workflow before Gmail, AI, Telegram, or n8n are connected: configure a yacht, prepare a deterministic draft from an enquiry, review it, approve it, and record it as sent with a complete history.

## Key decisions

- Historical offers are snapshots rather than live views of the current yacht profile.
- Exact dated rate periods are safer than vague season labels for deterministic suggestions.
- The supplied BOJI response structure becomes private editable production data, not repository text.
- Development fixtures use invented yachts, contacts, figures, materials, and wording.
- Email sending is deliberately outside this slice; `sent` means a staff member confirms the external action occurred.
- Workflow events are written now so future n8n flows consume stable facts instead of duplicating business rules.

## Release boundary

Phase 5 is complete only when commercial records and offer versions are protected by RLS, important transitions are database commands, pricing/template rules have automated tests, and the full manual browser path is verified with synthetic data.

## Implementation outcome

- Added yacht commercial profiles, exact effective rate periods, approved public material links, and versioned offer templates.
- Added deterministic fee calculation and allow-listed plain-text template rendering outside presentation components.
- Added numbered immutable offer snapshots with explicit draft, approved, sent, withdrawn, and superseded states.
- Kept approval and sent recording as separate human actions and prevented the generic enquiry state machine from selecting `offer_sent`.
- Added database-owned offer history, workflow events, and audit events for future background processing.
- Added offer preparation, review, search, yacht configuration, enquiry linkage, and live dashboard approval counts.
- Added a recovery path for stale local authentication after a development database reset.

## Verification outcome

All application, database, build, lint, dependency, and clean-session browser gates pass. The browser acceptance run verified the full template-to-sent-offer path, histories, live counts, responsive layout, access control, and console state. It also found and prompted fixes for stale-session login recovery and a misleading persisted draft-success notice before release.
