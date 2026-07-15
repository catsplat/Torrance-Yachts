# Phase 5 commercial and offer schema

## Authoritative records

| Record | Purpose |
| --- | --- |
| `yacht_commercial_profiles` | Editable overview, port/fuel guidance, features, references, default currency/tax, and short-charter divisor |
| `yacht_rate_periods` | Non-overlapping dated weekly rates |
| `yacht_sales_materials` | Approved public brochure/menu/crew-profile/specification links |
| `yacht_offer_templates` | Draft, approved, and retired versioned plain-text templates |
| `offers` | Numbered immutable commercial snapshots linked to enquiries |
| `offer_status_history` | Append-only offer lifecycle reasons and actors |

## Commands

- `approve_yacht_offer_template`: retires the previous approved version and approves the selected draft atomically.
- `create_offer_draft`: validates all source relationships, creates the next enquiry offer version, and supersedes unfinished prior versions.
- `update_offer_draft`: changes only an unlocked draft snapshot.
- `approve_offer`: locks the latest draft after an explicit human action.
- `mark_offer_sent`: records human-confirmed sending and moves an eligible enquiry to `offer_sent` in the same transaction.

Direct status changes and edits to approved/sent offers are rejected. RLS requires an active internal identity for every read or mutation. History and workflow events are application read-only.
