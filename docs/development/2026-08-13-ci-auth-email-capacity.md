# CI local Auth email capacity

**Date:** 13 August 2026
**Scope:** synthetic local Supabase/Mailpit acceptance only

## Observation

The remote cross-browser job failed only when its administrator invitation
returned the generic safe error state. The same clean workflow passed locally.
The local Auth configuration allowed two emails per hour, exactly the number
needed for a successful invitation and recovery path, leaving no capacity for a
Playwright retry or a harmless local Auth delivery retry.

## Change

The committed local Supabase configuration now allows ten emails per hour. The
local stack delivers only to Mailpit and never sends external email. This gives
the synthetic invitation/recovery proof bounded retry headroom.

## Boundary

This is not a production mail-rate decision. A client-owned hosted Supabase
project must set its own rate limits alongside SMTP, access policy and provider
acceptance. The application still uses one administrator-initiated invitation,
does not disclose Auth failures to staff, and preserves approval/MFA controls.

## Verification planned

- reset the disposable local database;
- run the invitation/password-recovery browser project;
- rerun remote PR CI, including the Linux cross-browser job.
