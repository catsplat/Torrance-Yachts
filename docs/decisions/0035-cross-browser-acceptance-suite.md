# ADR 0035: Cross-browser acceptance suite

**Status:** Accepted

**Date:** 9 August 2026

## Context

The application had extensive unit and PostgreSQL permission coverage plus
recorded manual browser walkthroughs. It did not have a reproducible automated
test proving that authentication, server components, client interactions, and
the database boundary continued to work together in the browsers relevant to
Windows and macOS staff.

## Decision

Use Playwright for end-to-end acceptance and `@axe-core/playwright` for
automated WCAG checks. Run the suite serially against one disposable Supabase
database because the rehearsal scenario deliberately creates and resets shared
fictional records. Exercise the core workspace in Chromium, Firefox, and WebKit;
run the mutating rehearsal once in Chromium.

Authentication uses an approved local account during development. CI generates
a one-time setup token and strong password at runtime, bootstraps the first
administrator through the public setup boundary, and never prints or commits
those values.

## Consequences

- Browser regressions are a merge-blocking CI failure rather than a manual
  discovery late in release preparation.
- Failed CI runs retain traces, screenshots, videos, and an HTML report for 14
  days.
- Automated accessibility checks complement, but do not replace, the required
  keyboard, screen-reader, and physical macOS acceptance checks.
- Serial execution takes longer than parallel execution but avoids test races
  and represents the application/database topology accurately.

## Dependency benefit

`@playwright/test` supplies the maintained multi-browser runtime, assertions,
tracing, and CI integration. `@axe-core/playwright` adds standards-based
accessibility analysis inside the same browser sessions. Reimplementing either
capability locally would be higher risk and substantially more custom code.
