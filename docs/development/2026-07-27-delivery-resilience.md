# Automation delivery resilience

Completed the local automation-resilience increment.

- Limited alert-delivery runs to 12 claimed items, three concurrent provider
  calls, and a 25-second execution budget.
- Reduced Gmail and Telegram request timeouts so a single stalled provider call
  cannot outlive its automation invocation.
- Added jittered exponential retry scheduling, an eight-attempt retry cap, and
  permanent-failure tracking.
- Added a restricted queue-health function for operational monitoring.
- Added database assertions covering trusted failure recording, initial retry
  bounds, queue health and anonymous access denial.

Local evidence after a fresh migration reset:

- `npm run db:test` — 670 assertions passed.
- `npm run check` — lint, strict TypeScript and 102 application tests passed.
- `npm run db:lint` — no schema warnings.
- `npm run build` — production build passed.
