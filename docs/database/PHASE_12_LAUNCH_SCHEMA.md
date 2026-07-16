# Phase 12 launch schema

## Tables

- `tutorial_sessions`: one isolated progress record per user.
- `tutorial_history`: append-only training and reset history.
- `launch_readiness_checks`: seeded production acceptance requirements with
  evidence and administrator review.
- `backup_verifications`: non-secret artifact identifiers, checksums, restore
  times, environment, outcome, and reviewer.

## Commands

- `start_tutorial`
- `pause_tutorial`
- `advance_tutorial`
- `reset_tutorial`
- `update_launch_readiness_check`
- `record_backup_verification`
- `get_launch_readiness_summary`

Direct mutation is blocked. Tutorial RLS restricts each user to their own state;
all active staff can read launch status; only administrators can read backup
artifact evidence. Every launch or backup review produces a durable workflow
event.

Tutorial stage transitions are ordered and cannot move backwards. Database tests
also prove that tutorial activity creates no notifications or integration
deliveries.
