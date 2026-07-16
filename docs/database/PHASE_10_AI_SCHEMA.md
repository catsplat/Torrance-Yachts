# Phase 10 AI assistance schema

## Tables

### `ai_runs`

Append-oriented provenance for one analysis request: source, analysis kind,
provider, model, prompt version, input hash, request key, status, token counts,
provider request ID, bounded failure information, and actor/timestamps.

### `ai_suggestions`

The validated structured result associated one-to-one with a completed run.
Contains the editable payload, summary, confidence, current review status, review
reason, reviewer, and review time.

### `ai_suggestion_evidence`

Exact source excerpts associated with structured field paths and confidence. The
trusted service verifies each excerpt occurs in the supplied source before calling
the database completion command.

### `ai_suggestion_revisions`

Append-only correction history containing the previous and replacement payload,
reason, actor, and timestamp.

### `communication_templates`

Versioned editable operational wording for `kyc_request`, `captain_contact`, and
`broker_follow_up`. Drafts may be changed; approved versions are immutable and new
work starts by cloning a version.

## Command boundary

Authenticated staff may request analysis, revise suggestions, and review them.
Only the server-side service role may start, complete, or fail an AI run. Template
creation and cloning are administrator-only, while approved-template mutation and
direct table lifecycle changes are blocked.

The Phase 9 email-classification command was extended to accept human-reviewed
yacht, charter dates, guests, ports, budget, and currency. This is deliberately a
human command rather than an automatic consequence of suggestion approval.

## Row Level Security

Active staff can read the operational review records. All writes use narrow
database functions that verify the authenticated profile, valid state transition,
source constraints, and actor attribution. AI history and workflow events are
never client-authored directly.
