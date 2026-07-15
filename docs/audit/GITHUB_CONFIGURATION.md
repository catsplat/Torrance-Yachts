# GitHub repository configuration

**Repository:** `catsplat/Torrance-Yachts`

**Recorded:** 15 July 2026
**Intended visibility:** Private

This record describes the repository controls required for the project. It contains no credentials or private operational data.

## Repository settings

- Visibility is private.
- GitHub Issues and Projects are enabled for traceable work planning.
- The wiki is disabled so durable project knowledge remains reviewable in the repository.
- GitHub Pages is not configured; the internal application is not published as a static public site.
- Squash merging is enabled to keep `main` history concise.
- Head branches are deleted automatically after pull-request merges.
- `main` is the default branch.

## Change controls

- `.github/workflows/ci.yml` runs locked dependency installation, linting, type checking, a production build, and a production-dependency audit on pull requests and pushes to `main`.
- `.github/CODEOWNERS` assigns repository-wide ownership to `@catsplat`.
- Pull-request and structured issue templates include validation and privacy checks.
- Dependabot checks npm packages weekly and GitHub Actions monthly.
- Branch protection should require the quality check, block force pushes/deletion, require linear history, and require pull requests when supported by the repository plan.
- GitHub secret scanning and push protection were requested but returned `422` because they are unavailable for this private repository on its current plan. Secret exclusion and review remain mandatory, and this control should be enabled if plan support changes.

## Content and disclosure controls

- The repository has no licence. Private ownership is retained while the boundary between the Torrance product and any future portfolio/open-source edition is decided.
- Only sanitised portfolio evidence belongs in this repository.
- Vulnerabilities are reported through private security advisories rather than ordinary issues.
- Secrets are stored outside Git and represented only by variable names in future example environment files.

## Verification procedure

After meaningful configuration changes:

1. Confirm the repository reports `PRIVATE` visibility with `gh repo view`.
2. Confirm GitHub Pages is absent.
3. Confirm the quality workflow succeeds on a pull request.
4. Confirm merge settings and default branch through the GitHub API.
5. Confirm branch protection after the initial quality workflow exists on `main`.

Any setting that cannot be enforced by the current GitHub plan must be recorded as a limitation rather than assumed.
