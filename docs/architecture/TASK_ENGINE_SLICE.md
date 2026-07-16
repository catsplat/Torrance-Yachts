# Phase 7 task-engine architecture

```text
Approved task template version
          |
          v
Human confirms signed booking
          |
          v
PostgreSQL transaction
  - booking + reservation
  - Yachtfolio action
  - generated tasks
  - dependency graph
  - schedules and blockers
  - history + workflow event
          |
          v
Task register / booking checklist / dashboard
```

## Command boundary

Direct task, status, dependency, history, and template mutation is blocked. Authenticated commands validate the active user and enforce:

- idempotent generation;
- ready-only completion;
- dependency unlock and reopening propagation;
- required date resolution;
- active assignees;
- reasons for completion, reopening, schedule changes, and cancellation;
- ad-hoc-only cancellation;
- template administrator permissions;
- acyclic dependency graphs.

## Scheduling

Template steps can anchor to booking confirmation, charter start, charter end, or one of three reviewed contract-payment dates. Booking anchors resolve immediately. Payment anchors remain visibly blocked until Phase 8 writes reviewed dates through the controlled schedule command.

Reminder lead time and escalation delay are retained on every generated task. Phase 11 will consume them through the central notification service; no notification is sent in Phase 7.

## Human control

Task completion always records evidence. Yachtfolio task 1.E cannot complete until the linked Yachtfolio action has separately been marked complete. AI and n8n have no authority in this slice.
