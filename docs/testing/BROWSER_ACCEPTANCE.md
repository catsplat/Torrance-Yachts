# Browser acceptance

The Playwright suite uses generated fictional identities and records. It covers
administrator, staff, unapproved-user and mobile-review roles without storing
credentials in Git.

## Covered boundaries

- bootstrap closure, password login, approved Google callback behaviour and
  unapproved-account isolation;
- TOTP enrolment/challenge and AAL2 workspace enforcement;
- staff/administrator separation across every administration route;
- private navigation, saved work views, notifications, theme and search;
- five-route inbox rehearsal, replay protection and reset;
- full enquiry-to-post-charter fictional workflow through the real UI;
- document, payment, task, Yachtfolio and follow-up boundaries;
- mobile review layout, keyboard focus/restore and automated WCAG A/AA checks;
- principal acceptance on Chromium, Firefox and WebKit.

Database and route-contract suites complement browser tests for malformed AI,
provider timeout/unavailability, availability conflicts, amendments,
cancellation, one-to-three instalments, scanning states, outbox leases and
provider reconciliation.

## Run

```powershell
npm run db:start
node ops/e2e/prepare-local-environment.mjs
npm run test:e2e
```

The generator creates ignored synthetic accounts, passwords, TOTP factors and
runtime environment values. The suite runs serially because projects share one
local database. Failure traces, screenshots and video remain ignored engineering
artifacts.

`npm run release:verify` runs the browser suite after a clean install, fresh
migration replay, database tests/lint, automation validation, production build,
dependency audit and disposable backup/restore drill.

## Remaining human checks

Automated accessibility detects only machine-testable issues. A real macOS
keyboard/browser walkthrough, staff training and client UAT remain launch gates.
