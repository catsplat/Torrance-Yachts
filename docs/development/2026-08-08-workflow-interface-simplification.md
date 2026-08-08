# Workflow interface simplification

The live local interface was reviewed from login through the authenticated
dashboard and Settings. The review found duplicated workflow explanations,
equal visual weight for operational and technical modules, and repetitive copy
around routine actions.

Implemented changes:

- reduced primary navigation to daily work, reference data and Settings;
- folded AI review into the inbox/dashboard path and integration delivery into
  alerts/Settings;
- replaced the dashboard's overlapping action cards and workflow strip with one
  ordered attention queue;
- shortened page headings, empty states, pending labels and form descriptions;
- removed the manual Telegram chat-ID field from the normal setup path;
- removed user-entered audit reasons from routine preference changes while
  retaining deterministic audit reasons in the server action;
- removed the same friction from routine email classification, enquiry and
  offer status changes, task completion and scheduling, message preparation,
  provider retries, tutorial reset and account recovery;
- retained free-text evidence for material booking, document, payment and
  external-system decisions;
- rebuilt the booking detail screen into a readable, maintainable workflow
  layout with concise actions and status language;
- grouped development and launch tools behind a collapsed section and excluded
  it from production;
- hid the environment badge in production.

Lint, strict TypeScript, unit tests, production build and an authenticated local
browser walkthrough are the acceptance gates for this change.
