# ADR-026: Workflow-first interface

## Status

Accepted — 8 August 2026

## Decision

The primary interface follows the employee's daily sequence:

`Inbox → Enquiries → Offers → Bookings → Tasks`

Calendar, yachts, contacts and documents remain reference registers. AI review
is reached from the inbox or the dashboard when work is waiting. Notification
delivery and provider configuration are reached from relevant alerts or
Settings rather than occupying primary navigation.

The dashboard has one attention queue followed by today's tasks, upcoming
charters, pipeline totals and booking checks. It does not repeat the workflow as
an additional diagram or set of explanatory cards.

Routine controls use short labels. Security and approval rules remain enforced
in application and database behavior; interface warnings are reserved for
exceptional, irreversible or blocked actions.

Routine, reversible actions do not ask staff to write audit prose. Server
actions record a clear standard description. Free-text evidence remains only
where the detail itself matters: booking confirmation, cancellation or
amendment, document and payment decisions, and external-work confirmation.

Development-only rehearsal and launch tools are collapsed and do not appear in
production navigation.

## Consequences

- New users can infer the working order from navigation and dashboard layout.
- Experienced staff reach daily work with fewer choices and less prose.
- System administration remains available without competing with operational
  work.
- Rehearsal records remain clearly marked in development data, while repetitive
  defensive language is removed from normal production screens.
