# ADR 0005: Human-reviewed, immutable offer snapshots

**Status:** Accepted

**Date:** 15 July 2026

## Context

Yacht descriptions, rates, taxes, public sales-material links, and response wording change over time. An offer must remain an accurate record of what was proposed even after those source records change. Future Gmail, AI, Telegram, and n8n integrations also need one safe approval boundary.

## Decision

- Yacht commercial content is editable source data in PostgreSQL.
- Rate periods use exact effective dates and cannot overlap for one yacht while active.
- Offer templates are versioned. Only an explicitly approved template version may create an offer draft.
- Draft creation renders a plain-text snapshot containing the selected commercial terms, template version, enquiry data, subject, and body.
- A draft may be edited only before approval. Approval locks its content.
- Recording an offer as sent is a separate human action and never sends email in Phase 5.
- Recording the first sent offer may move a `new` or `waiting_for_reply` enquiry to `offer_sent` atomically. That state is no longer available through the generic enquiry-status form. Negotiating enquiries retain their state when a revised offer is sent.
- A revised offer is a new numbered snapshot; historical sent offers are never rewritten.
- PostgreSQL records status history, workflow events, actor identity, and audit changes.

## Consequences

The system can reproduce historical proposals, external integrations have a single reviewed command to call, and later AI can draft without receiving authority to approve or send. This adds explicit version records and transition commands, but avoids ambiguous mutable documents.
