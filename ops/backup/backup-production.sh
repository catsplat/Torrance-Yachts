#!/usr/bin/env sh
set -eu
umask 077

# Creates a portable encrypted backup from the private CX23 Docker network.
# It never uses a public Supabase endpoint or exposes a database connection.

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }

setting() {
  sed -n "s/^$1=//p" .env | tail -n 1
}

environment=$(setting APP_ENVIRONMENT)
backup_directory=$(setting BACKUP_DIRECTORY)
encryption_recipient=$(setting BACKUP_ENCRYPTION_RECIPIENT)
offsite_remote=$(setting BACKUP_RCLONE_REMOTE)

case "$environment" in
  staging|production) ;;
  *) echo "APP_ENVIRONMENT must be staging or production for a hosted backup." >&2; exit 2 ;;
esac
test -n "$backup_directory" || { echo "BACKUP_DIRECTORY is missing." >&2; exit 2; }
test -n "$encryption_recipient" || { echo "BACKUP_ENCRYPTION_RECIPIENT is missing." >&2; exit 2; }

for command in age docker flock mktemp sha256sum tar; do
  command -v "$command" >/dev/null || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

mkdir -p -- "$backup_directory"
chmod 700 "$backup_directory"
exec 9>"$backup_directory/.backup.lock"
flock -n 9 || { echo "A backup is already running." >&2; exit 1; }

if [ "$environment" = "production" ]; then
  test -n "$offsite_remote" || {
    echo "BACKUP_RCLONE_REMOTE is required for a production backup." >&2
    exit 2
  }
  command -v rclone >/dev/null || { echo "rclone is required for a production backup." >&2; exit 1; }
fi

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

core_compose ps --status running --services | grep --fixed-strings --line-regexp db >/dev/null || {
  echo "The private database service is not running." >&2
  exit 1
}
storage_container=$(core_compose ps -q storage)
test -n "$storage_container" || { echo "The private storage service is not running." >&2; exit 1; }
db_container=$(core_compose ps -q db)
test -n "$db_container" || { echo "The private database container is missing." >&2; exit 1; }

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
artifact="$backup_directory/torrance-yachts-$environment-$timestamp-$$.tar.age"
test ! -e "$artifact" || { echo "Backup artifact already exists." >&2; exit 1; }

mkdir -p -- "$backup_directory"
chmod 700 "$backup_directory"

# The database container has local trust access to its own Postgres instance.
# Include migration history alongside public/Auth/Storage metadata so a restore
# can prove the schema version it recovered.
core_compose exec -T db pg_dump \
  -U postgres -d postgres --format=custom \
  --schema=public --schema=auth --schema=storage --schema=vault --schema=supabase_migrations \
  > "$temporary/database.dump"

# Storage objects live in the private Docker volume. A pinned utility image
# reads the volume through the running Storage container; no object is fetched
# through Cloudflare or a browser-safe API key.
docker run --rm --volumes-from "$storage_container" \
  -v "$temporary:/backup" \
  alpine@sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d \
  tar -C /var/lib/storage -cf /backup/storage.tar .

# Include the encryption-key/configuration volume and deployment secrets only
# inside the encrypted artifact. Never print or publish these recovery inputs.
docker run --rm --volumes-from "$db_container":ro \
  -v "$temporary:/backup" \
  alpine@sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d \
  tar -C /etc/postgresql-custom -cf /backup/database-config.tar .
cp .env "$temporary/deployment.env"

database_hash=$(sha256sum "$temporary/database.dump" | awk '{print $1}')
storage_hash=$(sha256sum "$temporary/storage.tar" | awk '{print $1}')
cat > "$temporary/backup-metadata.json" <<EOF
{
  "createdAt": "$timestamp",
  "environment": "$environment",
  "databaseFormat": "PostgreSQL custom",
  "databaseSha256": "$database_hash",
  "storageArchive": "storage.tar",
  "storageSha256": "$storage_hash"
}
EOF

# Separate commands: a tar failure must not be hidden by a successful encryptor.
tar -C "$temporary" -cf "$temporary/backup.tar" database.dump storage.tar database-config.tar deployment.env backup-metadata.json
age --recipient "$encryption_recipient" --output "$artifact" "$temporary/backup.tar"
(cd "$backup_directory" && sha256sum "$(basename "$artifact")") > "$artifact.sha256"
chmod 600 "$artifact" "$artifact.sha256"

if [ -n "$offsite_remote" ]; then
  command -v rclone >/dev/null || { echo "rclone is required when BACKUP_RCLONE_REMOTE is configured." >&2; exit 1; }
  rclone copyto "$artifact" "${offsite_remote%/}/$(basename "$artifact")"
  rclone copyto "$artifact.sha256" "${offsite_remote%/}/$(basename "$artifact").sha256"
  rclone checksum SHA256 "$artifact.sha256" "$offsite_remote" --download
fi

artifact_hash=$(awk '{print $1}' "$artifact.sha256")
state_file="$backup_directory/latest-success.json"
state_temporary="$temporary/latest-success.json"
cat > "$state_temporary" <<EOF
{
  "createdAt": "$timestamp",
  "environment": "$environment",
  "artifact": "$(basename "$artifact")",
  "artifactSha256": "$artifact_hash",
  "offsiteReplication": $(if [ -n "$offsite_remote" ]; then printf true; else printf false; fi)
}
EOF
chmod 600 "$state_temporary"
mv "$state_temporary" "$state_file"

echo "Encrypted private backup created: $(basename "$artifact")"
