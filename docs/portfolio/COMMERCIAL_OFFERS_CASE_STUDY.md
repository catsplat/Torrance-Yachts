# Portfolio case study: reviewable charter offers

## Problem

Commercial yacht replies combine changing rates, tax, port guidance, specifications, features, links, references, and enquiry-specific dates. Copying these manually risks stale terms and gives little evidence of what was approved or sent.

## Engineering response

Phase 5 separates editable commercial master data from immutable offer snapshots. Templates are versioned and explicitly approved, rate periods are effective-dated, pricing suggestions are deterministic, public material links require approval, and each offer has a human-controlled lifecycle with durable history.

## Safety properties

- Historical offers do not change when source data changes.
- AI and automation have no approval authority.
- Sent status records a human action and does not impersonate email delivery.
- No real rates, references, private contacts, or production templates are committed.
- Database permissions and command guards are tested independently of the UI.
