#!/usr/bin/env sh
set -eu
# Synthetic contract test: no real Docker, credentials, database or remote.
source_script="$(pwd)/ops/backup/backup-production.sh"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir "$work/bin" "$work/backups" "$work/offsite"
export TEST_WORK="$work"
cat > "$work/.env" <<EOF
APP_ENVIRONMENT=production
BACKUP_DIRECTORY=$work/backups
BACKUP_ENCRYPTION_RECIPIENT=synthetic
BACKUP_RCLONE_REMOTE=$work/offsite
EOF
touch "$work/supabase-core.compose.yml"
cat > "$work/bin/docker" <<'EOF'
#!/usr/bin/env sh
case "$*" in
  *'ps --status running --services'*) echo db;;
  *'ps -q storage'*) echo synthetic-storage;;
  *'ps -q db'*) echo synthetic-db;;
  *'exec -T db pg_dump'*) echo synthetic-database;;
  run*)
    mount=''
    previous=''
    for arg do
      if [ "$previous" = '-v' ]; then mount=${arg%:/backup}; fi
      previous=$arg
    done
    case "$*" in
      *'/backup/storage.tar'*) printf synthetic-storage > "$mount/storage.tar";;
      *'/backup/database-config.tar'*) printf synthetic-config > "$mount/database-config.tar";;
      *) exit 1;;
    esac;;
  *) exit 1;;
esac
EOF
cat > "$work/bin/age" <<'EOF'
#!/usr/bin/env sh
test "$1" = '--recipient'
test "$3" = '--output'
cp "$5" "$4"
EOF
cat > "$work/bin/rclone" <<'EOF'
#!/usr/bin/env sh
case "$1" in
  copyto) test "$#" = 3; cp "$2" "$3";;
  checksum)
    test ! -f "$TEST_WORK/fail-checksum" || exit 1
    cd "$4"
    sha256sum --check "$3";;
  *) exit 1;;
esac
EOF
chmod +x "$work/bin/"*
export PATH="$work/bin:$PATH"
cd "$work"
sh "$source_script"
test -f backups/latest-success.json
artifact=$(find backups -name '*.tar.age' | head -n 1)
tar -tf "$artifact" | grep -Fx database-config.tar
tar -tf "$artifact" | grep -Fx deployment.env
cp backups/latest-success.json previous-success.json
touch fail-checksum
if sh "$source_script"; then echo 'Failed checksum incorrectly accepted'; exit 1; fi
cmp backups/latest-success.json previous-success.json
rm fail-checksum
(
  flock -n 9
  if sh "$source_script"; then echo 'Concurrent backup incorrectly accepted'; exit 1; fi
) 9>backups/.backup.lock
echo 'Synthetic backup success, failed checksum and concurrency tests passed.'
