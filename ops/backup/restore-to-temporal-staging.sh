#!/usr/bin/env sh
set -eu

# Restores an encrypted artifact only into the disposable temporal-staging host.
# Production restoration remains a separately authorised incident procedure.

artifact=${1:-}
identity_file=${2:-}
confirmation=${3:-}

test -f "$artifact" || { echo "Provide an existing encrypted backup artifact." >&2; exit 2; }
test -f "$identity_file" || { echo "Provide the protected age identity file path." >&2; exit 2; }
test "$confirmation" = "RESTORE_SYNTHETIC_STAGING" || {
  echo "Refusing restore. Third argument must be RESTORE_SYNTHETIC_STAGING." >&2
  exit 2
}
test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Application Compose file is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }
test -f "$artifact.sha256" || { echo "The adjacent artifact checksum is missing." >&2; exit 2; }

setting() {
  sed -n "s/^$1=//p" .env | tail -n 1
}

environment=$(setting APP_ENVIRONMENT)
domain=$(setting APP_DOMAIN)
test "$environment" = "staging" || { echo "Refusing restore because APP_ENVIRONMENT is not staging." >&2; exit 2; }
case "$domain" in
  staging.*) ;;
  *) echo "Refusing restore because APP_DOMAIN is not a staging hostname." >&2; exit 2 ;;
esac

for command in age docker sha256sum tar; do
  command -v "$command" >/dev/null || { echo "Required command is missing: $command" >&2; exit 1; }
done

(cd "$(dirname "$artifact")" && sha256sum --check "$(basename "$artifact").sha256")

app_compose() {
  docker compose --env-file .env "$@"
}

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
age --decrypt --identity "$identity_file" --output "$temporary/backup.tar" "$artifact"
tar -C "$temporary" -xf "$temporary/backup.tar"
test -f "$temporary/database.dump" || { echo "Artifact does not contain database.dump." >&2; exit 2; }
test -f "$temporary/storage.tar" || { echo "Artifact does not contain storage.tar." >&2; exit 2; }
test -f "$temporary/backup-metadata.json" || { echo "Artifact does not contain backup metadata." >&2; exit 2; }

database_hash=$(sha256sum "$temporary/database.dump" | awk '{print $1}')
storage_hash=$(sha256sum "$temporary/storage.tar" | awk '{print $1}')
grep --fixed-strings --quiet "$database_hash" "$temporary/backup-metadata.json" || {
  echo "Database backup checksum does not match artifact metadata." >&2
  exit 2
}
grep --fixed-strings --quiet "$storage_hash" "$temporary/backup-metadata.json" || {
  echo "Storage backup checksum does not match artifact metadata." >&2
  exit 2
}

app_compose down --remove-orphans
core_compose up -d db --wait --wait-timeout 240
db_container=$(core_compose ps -q db)
test -n "$db_container" || { echo "Private database container could not be identified." >&2; exit 1; }

core_compose stop auth rest storage kong
core_compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
drop schema if exists public cascade;
drop schema if exists auth cascade;
drop schema if exists storage cascade;
drop schema if exists supabase_migrations cascade;
create schema public;
SQL
docker cp "$temporary/database.dump" "$db_container:/tmp/torrance-restore.dump"
core_compose exec -T db pg_restore \
  -U postgres -d postgres --no-owner --no-privileges --exit-on-error \
  /tmp/torrance-restore.dump
core_compose exec -T db rm -f /tmp/torrance-restore.dump

storage_container=$(core_compose ps -aq storage)
test -n "$storage_container" || { echo "Private storage container could not be identified." >&2; exit 1; }
docker run --rm --volumes-from "$storage_container" \
  -v "$temporary:/backup:ro" \
  alpine@sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d \
  sh -ec 'find /var/lib/storage -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -C /var/lib/storage -xf /backup/storage.tar'

core_compose up -d --wait --wait-timeout 240
app_compose up -d --remove-orphans --wait --wait-timeout 240
printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(basename "$artifact")" "$database_hash" > .staging-restore-evidence
chmod 600 .staging-restore-evidence
echo "Synthetic staging restore completed. Verify operational counts before any promotion."
