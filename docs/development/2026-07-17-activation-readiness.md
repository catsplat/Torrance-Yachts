# Activation readiness hardening

**Date:** 17 July 2026

## Outcome

The final Phase 12 hardening closes the gap between a technically verified build
and a safely installable release candidate. A fresh deployment can create its
first administrator without direct database editing or public registration, and
administrators can inspect truthful integration readiness without exposing
secrets or automatically enabling external side effects.

## Implementation choices

- Used a temporary, high-entropy deployment token for one-time administrator
  bootstrap and automatically closed setup after the first profile.
- Created the pending profile inactive in the Auth trigger, then used one
  least-privilege database transaction for uniqueness, promotion, and audit.
- Kept SMTP credentials outside the web UI and used an explicit production
  verification marker.
- Added recent-ingestion evidence for Gmail rather than treating the presence of
  a token as proof that email routing works.
- Added private n8n health checking while retaining explicit workflow activation.
- Described Yachtfolio as an audited human boundary rather than a broken sync.

## Scope retained

The database remains the source of truth. n8n remains a scheduler/adapter. AI
remains advisory. The existing Settings tutorial, database-backed dashboard,
notification centre, personal OAuth, dark mode, and twelve-phase workflow were
not replaced or duplicated.
