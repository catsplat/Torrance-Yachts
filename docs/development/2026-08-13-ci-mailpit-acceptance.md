# CI Mailpit invitation acceptance

**Date:** 13 August 2026
**Scope:** disposable CI Supabase stack only

## Observation

The Linux browser job started Supabase with its local Mailpit/Inbucket service
excluded. The invitation action therefore received an Auth error before an
email could be delivered, while the user interface correctly returned a generic
safe failure message.

## Change

The browser job now keeps Mailpit enabled. Invitation and password-recovery
acceptance reads the resulting local-only inbox at the test port. The other
unneeded Supabase services remain excluded to keep CI bounded.

## Security boundary

Mailpit is an isolated GitHub runner service. It has no external SMTP
configuration, recipients or production credentials. This change does not
alter production Auth delivery, rate limits, invitation approval, MFA, RLS or
the generic staff-facing failure message.

## Verification

The local stack was started with the same excluded-service list used in CI,
then the invitation and recovery Playwright project passed.
