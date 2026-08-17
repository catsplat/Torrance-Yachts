#!/usr/bin/env sh
set -eu

# Verifies that the most recent completed encrypted backup is recent and has
# not changed on the VPS. This is a monitoring check, not a restore command.

maximum_age_hours=${1:-27}
case "$maximum_age_hours" in
  ''|*[!0-9]*) echo "Maximum age must be a whole number of hours." >&2; exit 2 ;;
esac
test "$maximum_age_hours" -gt 0 || { echo "Maximum age must be greater than zero." >&2; exit 2; }

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
setting() {
  sed -n "s/^$1=//p" .env | tail -n 1
}

environment=$(setting APP_ENVIRONMENT)
backup_directory=$(setting BACKUP_DIRECTORY)
case "$environment" in
  staging|production) ;;
  *) echo "APP_ENVIRONMENT must be staging or production for backup monitoring." >&2; exit 2 ;;
esac
test -n "$backup_directory" || { echo "BACKUP_DIRECTORY is missing." >&2; exit 2; }

state_file="$backup_directory/latest-success.json"
test -f "$state_file" || { echo "No successful encrypted backup has been recorded." >&2; exit 1; }

now=$(date -u +%s)
completed_at=$(stat -c %Y "$state_file")
age_seconds=$((now - completed_at))
maximum_age_seconds=$((maximum_age_hours * 3600))
if [ "$age_seconds" -lt 0 ] || [ "$age_seconds" -gt "$maximum_age_seconds" ]; then
  echo "Latest encrypted backup is older than ${maximum_age_hours} hours." >&2
  exit 1
fi

artifact=$(sed -n 's/^[[:space:]]*"artifact"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$state_file" | head -n 1)
expected_hash=$(sed -n 's/^[[:space:]]*"artifactSha256"[[:space:]]*:[[:space:]]*"\([a-f0-9]*\)".*/\1/p' "$state_file" | head -n 1)
case "$artifact" in
  ''|*/*|*\\*) echo "Backup state references an invalid artifact name." >&2; exit 1 ;;
esac
case "$expected_hash" in
  ''|*[!a-f0-9]*) echo "Backup state does not contain a valid artifact checksum." >&2; exit 1 ;;
esac
test ${#expected_hash} -eq 64 || { echo "Backup state does not contain a valid artifact checksum." >&2; exit 1; }

artifact_path="$backup_directory/$artifact"
test -f "$artifact_path" || { echo "Latest encrypted backup artifact is missing." >&2; exit 1; }
actual_hash=$(sha256sum "$artifact_path" | awk '{print $1}')
test "$actual_hash" = "$expected_hash" || { echo "Latest encrypted backup checksum does not match its success record." >&2; exit 1; }

if [ "$environment" = "production" ] && ! grep -Eq '"offsiteReplication"[[:space:]]*:[[:space:]]*true' "$state_file"; then
  echo "Production backup success record lacks off-site replication evidence." >&2
  exit 1
fi

echo "Encrypted $environment backup is recent and locally checksum-verified."
