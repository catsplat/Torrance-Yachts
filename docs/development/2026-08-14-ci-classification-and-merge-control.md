# CI classification and merge control

**Date:** 14 August 2026

## Why this changed

The full release suite was correctly proving the application, database, browser,
deployment and desktop paths, but it also ran for a documentation-only pull
request. The expensive jobs are valuable for product changes and unnecessary for
Markdown housekeeping.

## Implementation

- Added a change-classification job to `.github/workflows/ci.yml`.
- Added `npm run docs:check`, which validates repository-local Markdown links
  and JSON without adding a dependency.
- Kept all five release jobs for every non-documentation path.
- Added Playwright and Cargo/Tauri caches keyed by the relevant lockfiles.
- Updated the PR template and repository configuration record with the manual
  merge requirement required by the current private GitHub plan.

## Verification

- `node ops/validate-documentation.mjs` passed across the existing Markdown
  documentation set.
- The new validator itself passed ESLint.
- The GitHub Actions workflow is exercised by the pull request created for this
  change; its documentation-only classification must be visible in the run.

## Follow-up

Enable GitHub required checks and branch protection when the repository plan
supports them. Do not treat the current manual rule as an equivalent technical
control.
