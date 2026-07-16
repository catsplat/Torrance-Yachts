# Backup and restore runbook

## Layers

1. Supabase Pro managed daily database backups.
2. Daily encrypted logical export of `public`, `auth`, and `storage` metadata.
3. Daily export of private Storage objects with individual SHA-256 hashes.
4. Encrypted off-site copy in a separate account/provider or failure domain.
5. VPS provider backups for application/n8n configuration and encrypted
   credentials.
6. n8n encryption key held separately from the n8n data backup.

Provider-managed Vault, Realtime, and analytics internals are excluded from the
portable logical export. Managed physical backup and provider reconfiguration
cover those services.

## Schedule

- daily encrypted application/database/document export;
- retain at least seven daily copies;
- retain monthly copies under the approved policy;
- automated alert if no successful daily artifact exists;
- monthly checksum verification;
- quarterly isolated restore drill and before every material migration.

## Restore

1. Declare the incident and disable integrations.
2. Preserve the failed environment for evidence.
3. Select the accepted restore point and verify its external checksum.
4. Restore into staging or a new project first.
5. verify identities, yachts, enquiries, offers, bookings, tasks, document
   metadata/objects, payments, notifications, and audit history;
6. rotate any potentially exposed credentials;
7. obtain administrator approval before switching DNS or production traffic;
8. record recovery time, recovery point, evidence, and follow-up actions.

The included local drill restores into a disposable database and never overwrites
the active database.
