# Backup and restore runbook

## Layers

1. Hetzner VPS backups for the protected host and its lean Supabase core.
2. Daily encrypted logical export of `public`, `auth`, and `storage` metadata.
3. Daily export of private Storage objects with individual SHA-256 hashes.
4. Encrypted off-site copy in a separate account/provider or failure domain.
5. Versioned Compose/runtime configuration and separately protected recovery
   material required to rebuild the private service.

The first hosted profile does not run Studio, Realtime, analytics or edge
functions. Recovery of the lean core uses the pinned bootstrap, versioned
migrations, protected runtime configuration and the verified exports above.

## Schedule

- daily encrypted application/database/document export;
- retain at least seven daily copies;
- retain monthly copies under the approved policy;
- automated alert if no successful daily artifact exists;
- monthly checksum verification;
- quarterly isolated restore drill and before every material migration.

The reviewed `torrance-yachts-backup.timer` is installed only after the first
manual encrypted export succeeds. It runs daily at 03:17 UTC with up to 20
minutes of jitter, catches up once after downtime, and uses `flock` to prevent
overlapping exports. The associated service runs as the non-root deployment user
with a private temporary directory and restrictive file permissions.

## CX23 export command

Install `age` and `rclone` during server activation, configure the client-owned
off-site rclone remote directly on the VPS, then run the protected export from
the deployment directory:

```sh
./backup-production.sh
```

The script reads the local Docker `db` and Storage volume only. It requires a
public `age` recipient and makes an encrypted local artifact with checksum. In
production it refuses to succeed unless that artifact is copied to the configured
off-site rclone destination. Keep the corresponding `age` private identity away
from the VPS.

After the first successful export, enable the checked-in schedule:

```sh
sudo ./install-backup-schedule.sh <deployment-user> /opt/torrance-yachts
systemctl list-timers torrance-yachts-backup.timer
```

Monitor the newest artifact without decrypting it:

```sh
./verify-backup-freshness.sh 27
```

It checks the recorded success timestamp, local encrypted artifact checksum and
production off-site replication evidence. It does not replace the periodic
isolated restore drill.

## Hosted staging restore rehearsal

Only after an export has completed and its private `age` identity is available
outside the VPS, rehearse a recovery on the disposable staging hostname:

```sh
./restore-to-temporal-staging.sh \
  <encrypted-artifact.tar.age> \
  <protected-age-identity-file> \
  RESTORE_SYNTHETIC_STAGING
```

The command rejects production and non-staging hostnames, verifies both archive
checksums, restores database and private Storage content, and writes non-secret
restore evidence. Inspect the restored operational counts before treating the
rehearsal as accepted.

## Restore

1. Declare the incident and disable integrations.
2. Preserve the failed environment for evidence.
3. Select the accepted restore point and verify its external checksum.
4. Restore into staging or a new isolated host first.
5. verify identities, yachts, enquiries, offers, bookings, tasks, document
   metadata/objects, payments, notifications, and audit history;
6. rotate any potentially exposed credentials;
7. obtain administrator approval before switching DNS or production traffic;
8. record recovery time, recovery point, evidence, and follow-up actions.

The included local drill restores into a disposable database and never overwrites
the active database.
