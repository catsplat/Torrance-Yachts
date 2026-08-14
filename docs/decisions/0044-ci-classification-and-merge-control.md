# 0044 — CI classification and merge control

**Date:** 14 August 2026
**Status:** Accepted

## Context

The project has a deliberately broad five-gate release suite: application
quality, database/RLS, browser acceptance, deployment/recovery validation and
Windows desktop packaging. The browser and desktop jobs are materially slower
than a documentation change needs, yet they must not be skipped for any change
that could affect runtime behaviour, release configuration or deployment.

The current GitHub plan does not permit branch protection or required status
checks for this private repository. That limitation cannot be solved honestly in
workflow YAML: an owner can still merge a pull request while non-required checks
are running.

## Decision

CI classifies a pull request or `main` push as documentation-only only when
every changed path is Markdown, `docs/`, or `catalog/`. That path runs a
dependency-free validation of local Markdown links and repository JSON.

Every other change runs the entire five-gate suite. This includes application
code, SQL/migrations, tests, dependencies, Docker/Compose, scripts, GitHub
workflow files and desktop/Tauri files. Playwright browser downloads and
Cargo/Tauri build artefacts are cached using lockfile-based keys; installation
and compilation commands still run, so cached data cannot replace validation.

Until branch protection is available, the pull-request template and repository
configuration record make the manual merge rule explicit: do not merge while an
applicable check is queued, running or failed. Once GitHub supports private
required checks on the selected plan, enable all five release-gate names and the
documentation validation job as required checks on `main`.

## Consequences

- Documentation housekeeping is faster and still validates its local links.
- Product changes retain the existing release assurance.
- The project does not claim that workflow code can enforce a GitHub account-plan
  feature it cannot access.
- CI timing and cache health should be reviewed after several real pull requests
  before changing timeouts or removing checks.
