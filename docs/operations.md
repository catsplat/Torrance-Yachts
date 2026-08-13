# Operations guide

Administrators operate the service through **Settings > Operations**, **Connection
status**, **Audit log**, and **Launch**. Routine staff do not need VPS, Docker,
Supabase Studio or n8n access.

Daily checks:

1. review failed/old delivery outbox items and Gmail reconciliation lag;
2. review AI permanent failures without exposing message bodies in logs;
3. confirm ClamAV is ready and recover only `pending`/`error` quarantine records;
4. inspect overdue operational tasks and provider divergence;
5. verify the latest backup/restore evidence is within the accepted window.

Monthly maintenance includes dependency and image updates through a pull request,
an n8n audit, access review, expired OAuth review, backup restore rehearsal and
retention alerts. Never repair business state directly in n8n or external mirrors.

Use the focused runbooks in `docs/operations/` for backup/restore, incidents,
integration activation, privacy/retention and final launch acceptance.

