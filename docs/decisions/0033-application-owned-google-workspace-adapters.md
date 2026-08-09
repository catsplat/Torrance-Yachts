# ADR 0033: Application-owned Google Workspace adapters

**Status:** Accepted  
**Date:** 9 August 2026

## Decision

Calendar, Drive and Sheets deliveries are performed by bounded application
services using one administrator-selected staff Google OAuth connection. n8n
remains the scheduler and does not hold a second set of Google credentials.

PostgreSQL creates and leases every delivery, records completion/failure and
remains authoritative. Calendar and Sheets are mirrors; Drive is a controlled
copy of a clean, verified private document.

## Reasons

- Staff use familiar Google consent rather than copying client secrets.
- One refresh-token and Vault boundary is easier to revoke and audit.
- Provider retry, idempotency and failure rules remain version-controlled code.
- The architecture avoids duplicating business authority inside n8n.

## Consequences

- The selected staff account must approve Calendar events, Drive file and Sheets
  scopes in addition to Gmail.
- Live targets are chosen and accepted separately by an administrator.
- OAuth verification and client-owned production configuration remain launch
  gates; fake-provider success is not described as live provider acceptance.
