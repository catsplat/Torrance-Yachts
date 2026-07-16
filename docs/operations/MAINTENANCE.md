# Maintenance schedule

## Daily

- confirm application and n8n health;
- inspect failed deliveries and notification failures;
- confirm backup artifact completion;
- review urgent/overdue operational work.

## Weekly

- review inactive accounts and provider errors;
- inspect dependency alerts;
- check disk, memory, TLS, and VPS backup status;
- confirm mailbox/Telegram/Google credentials remain valid.

## Monthly

- install tested security updates;
- run application, database, dependency, n8n, and secret scans;
- verify backup checksums and off-site replication;
- review access, integration scopes, audit events, and costs;
- test the client tutorial against the current interface.

## Quarterly

- complete an isolated restore drill;
- run `n8n audit`;
- review retention/deletion eligibility;
- repeat macOS critical-workflow acceptance;
- review incident contacts, recovery ownership, and operating costs.

Every change follows the private GitHub pull-request, CI, changelog, and semantic
release process.
