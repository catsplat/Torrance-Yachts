# Backup and restore tooling

## Hosted CX23 backup

`backup-production.sh` runs on the protected VPS from the deployment directory.
It creates a PostgreSQL custom-format dump of the application, Auth, Storage and
migration-history schemas; archives the private Storage volume directly through
Docker; encrypts both with an `age` public recipient; and writes a SHA-256
checksum beside the artifact.

It deliberately does **not** call the public application hostname, Cloudflare,
Kong, browser-safe keys or a managed Supabase database URL. The database and
documents remain on the private Docker network while being exported.

The runtime `.env` must contain:

- `BACKUP_DIRECTORY` — a protected local staging directory;
- `BACKUP_ENCRYPTION_RECIPIENT` — the public half of an `age` key whose private
  identity is stored away from the VPS; and
- `BACKUP_RCLONE_REMOTE` — a client-owned off-site destination. It is mandatory
  when `APP_ENVIRONMENT=production`.

The server needs `age` and, for off-site replication, `rclone`. The first hosted
activation must install these tools, configure the remote directly on the VPS,
and complete an isolated restore before live records are entered. Neither the
private age identity nor rclone credentials belong in Git or chat.

Hetzner Backups protect the VPS disk as one layer; they do not replace the
encrypted logical and Storage export in a different failure domain.

## Hosted restore rehearsal

`restore-to-temporal-staging.sh` accepts an encrypted artifact and its matching
`age` private identity, but refuses any environment except a `staging.*`
hostname with `APP_ENVIRONMENT=staging`. It verifies the external and internal
checksums, stops the staging application, restores database schemas and the
private Storage volume, then starts the services again. It requires the literal
confirmation `RESTORE_SYNTHETIC_STAGING`.

It is for the disposable staging acceptance host only. Production restoration
remains an incident operation with explicit client authorisation.

## Local restore drill

`local-restore-drill.ps1`:

1. creates a custom-format dump inside the local Supabase Postgres container;
2. copies the artifact into ignored `.artifacts/backup-drill/`;
3. restores it into a new disposable database;
4. verifies critical table and storage-metadata counts;
5. calculates SHA-256 evidence; and
6. drops the disposable database.

It never overwrites the active local database. Use synthetic data only. Record
the non-secret checksum and result in `/settings/launch`.
