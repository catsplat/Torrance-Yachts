# Backup and restore tooling

## Production

`backup-production.sh` creates a PostgreSQL custom-format dump of the application,
Auth, and Storage metadata schemas; exports every private Supabase Storage object
with a SHA-256 manifest; packages both; encrypts the archive to an `age`
recipient; and writes an external checksum. Provider-managed Vault secrets,
Realtime internals, and analytics schemas are deliberately excluded from the
portable logical export.

Run it from a protected Linux host using secrets supplied by the host secret
store. The encryption identity must be held separately from the backup location.
Copy the resulting `.tar.age` and `.sha256` files to an off-site destination in a
different provider/account or failure domain.

The script deliberately refuses to run without:

- PostgreSQL `pg_dump`;
- Node.js and the locked application dependencies;
- `age`;
- `tar` and `sha256sum`;
- a production database URL, Supabase URL and server-only key, encryption
  recipient, and backup destination.

Schedule daily exports and alert when no successful artifact is produced. Retain
at least seven daily copies and monthly copies according to the client-approved
retention policy. Managed Supabase Pro daily backups remain an additional layer,
not a replacement for a tested off-site logical and document export.

## Local restore drill

`local-restore-drill.ps1`:

1. creates a custom-format dump inside the local Supabase Postgres container;
2. copies the artifact into ignored `.artifacts/backup-drill/`;
3. restores it into a new disposable database;
4. verifies critical table and storage-metadata counts;
5. calculates SHA-256 evidence; and
6. drops the disposable database.

It never overwrites the active local database. Use synthetic data only. Record the
non-secret checksum and result in `/settings/launch`.
