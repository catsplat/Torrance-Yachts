# ADR 0009: Dual hosted and local desktop distributions

**Status:** Validated as a secondary future distribution; deferred from the first
production launch

## Context

The primary delivery remains the hosted private web application defined by the
programme. A second, later distribution may package the same product as a local
desktop application that keeps operational data, documents, automation, and
optionally AI on the employee's computer.

The principal client computer is macOS. A Windows `.exe` therefore cannot be the
only deliverable; equivalent signed macOS `.app`/`.dmg` packaging is required.

## Direction

### Primary: hosted web product

- Continue the existing twelve-phase implementation without changing its critical
  path.
- Deploy the private web application, PostgreSQL, storage, and automation using the
  production topology selected in Phase 12.
- Support reliable background processing even when the employee's computer is off.

### Secondary: packaged local product

- Keep the web interface and open it inside a desktop shell.
- Store application data and private documents in an application-owned local data
  directory created by the installer.
- Run the PostgreSQL-backed application service and self-hosted n8n Community
  Edition as managed local background services.
- Use Ollama when fully local AI is required; cloud AI providers remain optional.
- Use localhost OAuth callbacks and outbound internet connections for Gmail,
  Telegram, Google Calendar, Drive, and Sheets. Those integrations cannot operate
  without internet merely because the application is local.
- Provide encrypted backup/export and restore before real business use.

## Important constraints

A reliable product will be delivered as an installer, not literally a single
portable executable containing mutable databases and documents. The installer can
make setup effectively one-click while keeping data in a predictable, backed-up
folder. The employee's computer must be powered on for scheduled automation.

The packaged edition is investigated only after the hosted product's operational
workflow and integrations are stable. PostgreSQL remains the source of truth in
both distributions; neither deployment justifies replacing it with ad-hoc files
or spreadsheets.

## Phase 12 validation result

The architecture remains technically feasible, but a production-quality local
edition is not a single copied executable. It requires signed Windows and macOS
installers, managed application/database/n8n services, encrypted local secrets,
upgrade and rollback handling, local backup/restore, OAuth callbacks, and a clear
warning that automation stops when the computer is off.

The principal client computer is macOS, so delivering only a Windows `.exe` would
not meet the brief. The hosted product is therefore the first launch target.
Desktop packaging can reuse the same web UI and contracts later without changing
the PostgreSQL source-of-truth or human-approval boundaries.
