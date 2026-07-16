# Personal alerts and workflow polish

**Date:** 16 July 2026

## Outcome

Release `v0.13.0` hardens the twelve-phase release candidate around real daily
use. It replaces the placeholder notification bell and global search, adds
personal alert routes and encrypted Gmail OAuth credentials, introduces a
persistent dark theme, and reorganises navigation and the dashboard around the
client's email-to-follow-up sequence.

## Important implementation choices

- Kept PostgreSQL as the source of truth and n8n as the scheduler.
- Processed one pending email AI suggestion per tick so provider latency is
  bounded and alerts can include labelled summaries and suggested replies.
- Allowed automatic provider delivery only for internal staff alerts.
- Limited external email integration to approved Gmail draft creation.
- Put task-specific communication preparation beside the numbered workflow task.
- Replaced a 1,000-row dashboard task count with exact count queries and a bounded
  priority list.

## Verification scope

- application lint, type checking, unit tests, production build, and dependency
  audit;
- complete migration replay, database lint, and all RLS/behaviour tests;
- n8n workflow JSON validation/import and security audit;
- production Compose validation and container smoke tests;
- authenticated local walkthrough of dashboard, notifications, search, dark
  mode, settings, and numbered task assistance.
