# ADR 0025: Server-side inbox register

## Status

Accepted — 27 July 2026.

## Decision

The operational inbox uses PostgreSQL cursor pagination on
`(received_at, id)`, with classification/search/count contracts executed
under the authenticated user's RLS context. The previous 1,000-message
in-memory window and client-side filtering are removed.

The inbox retains an independently calculated review-required count so the
daily workflow badge remains accurate even when the current filter is narrow.

## Consequences

- Historic enquiries cannot disappear from inbox search because newer messages
  have filled a fixed UI fetch window.
- Search remains a literal, case-insensitive substring match; it is not a
  provider search and does not send query text outside the database.
- The page exposes only page-local rows but an accurate filtered total.
