#!/usr/bin/env bash
set -euo pipefail

: "${PRODUCTION_DATABASE_URL:?Set PRODUCTION_DATABASE_URL}"
: "${NEXT_PUBLIC_SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL}"
: "${SUPABASE_SECRET_KEY:?Set SUPABASE_SECRET_KEY}"
: "${BACKUP_ENCRYPTION_RECIPIENT:?Set BACKUP_ENCRYPTION_RECIPIENT}"
: "${BACKUP_DIRECTORY:?Set BACKUP_DIRECTORY}"

for command in age node pg_dump sha256sum tar; do
  command -v "$command" >/dev/null || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="$(mktemp -d)"
trap 'rm -rf -- "$temporary"' EXIT
artifact="$BACKUP_DIRECTORY/torrance-yachts-$timestamp.tar.age"

mkdir -p -- "$BACKUP_DIRECTORY" "$temporary/storage"
pg_dump \
  --dbname="$PRODUCTION_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --file="$temporary/database.dump"
node ops/backup/export-storage.mjs "$temporary/storage"

cat >"$temporary/backup-metadata.json" <<EOF
{
  "createdAt": "$timestamp",
  "databaseFormat": "PostgreSQL custom",
  "storageManifest": "storage/storage-manifest.json"
}
EOF

tar -C "$temporary" -cf - database.dump storage backup-metadata.json \
  | age --recipient "$BACKUP_ENCRYPTION_RECIPIENT" --output "$artifact"
sha256sum "$artifact" >"$artifact.sha256"
chmod 600 "$artifact" "$artifact.sha256"
echo "Encrypted backup created: $(basename "$artifact")"
