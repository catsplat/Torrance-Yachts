# Contributing

This is a private internal-business project. Access to the repository does not authorise the use of live Torrance Yachts or client data in source control, issues, pull requests, test fixtures, logs, screenshots, or demonstrations.

## Before changing the project

1. Read `AGENTS.md`, `docs/PROJECT_BRIEF.md`, and the relevant architecture decision records.
2. Start from an up-to-date `main` branch and create a short-lived `codex/` or descriptive feature branch.
3. Define a small vertical slice with acceptance criteria and a safe rollback.
4. Use synthetic or explicitly sanitised data.

## Development workflow

```powershell
npm ci
npm run dev
```

Before opening or updating a pull request:

```powershell
npm run check
npm run build
npm audit
```

Add focused automated tests whenever business rules, permissions, state transitions, calculations, retries, or integration boundaries are introduced.

## Commits and pull requests

- Use clear conventional commit messages such as `feat: add yacht list` or `docs: record authentication decision`.
- Keep commits reviewable and avoid mixing unrelated work.
- Open a pull request rather than pushing product changes directly to `main`.
- Complete the pull-request safety and validation checklist.
- Update `CHANGELOG.md` for user-visible changes and add decision, development, audit, or portfolio evidence when relevant.

## Security and privacy

Follow `SECURITY.md`. In particular, never commit:

- credentials, tokens, keys, or environment files;
- live emails, client details, passports, KYC/CDD files, contracts, or invoices;
- private contacts, bank details, or current commercial terms;
- unredacted logs, screenshots, AI traces, or external-service payloads.

Report suspected vulnerabilities using a private GitHub security advisory.
