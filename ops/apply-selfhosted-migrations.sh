#!/usr/bin/env sh
set -eu

# Applies the reviewed SQL migration directory from the deployment package to
# the private self-hosted Postgres container. GitHub Actions deliberately never
# receives a database connection string: it stages this script and the signed
# release migrations on the VPS, where Docker's private network reaches db.

mode=${1:-apply}
case "$mode" in
  apply|verify) ;;
  *) echo "Usage: $0 [apply|verify]" >&2; exit 2 ;;
esac

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }
test -d migrations || { echo "Reviewed migration directory is missing." >&2; exit 2; }

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

core_compose ps --status running --services | grep --fixed-strings --line-regexp db >/dev/null || {
  echo "The private database service is not running." >&2
  exit 1
}

core_compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

manifest_file=.deployed-migrations.next
: > "$manifest_file"

for migration in $(find migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort); do
  case "$migration" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*.sql) ;;
    *) echo "Invalid migration filename: $migration" >&2; exit 2 ;;
  esac

  version=${migration%%_*}
  name=${migration#*_}
  name=${name%.sql}
  case "$name" in
    ""|*[!A-Za-z0-9_-]*) echo "Unsafe migration name: $migration" >&2; exit 2 ;;
  esac
  migration_path="migrations/$migration"
  applied=$(core_compose exec -T db psql -U postgres -d postgres -Atqc \
    "select 1 from supabase_migrations.schema_migrations where version = '$version'" || true)
  checksum=$(sha256sum "$migration_path" | awk '{print $1}')

  if [ "$applied" = "1" ]; then
    printf '%s %s %s\n' "$version" "$checksum" "$name" >> "$manifest_file"
    continue
  fi

  if [ "$mode" = "verify" ]; then
    echo "Pending reviewed migration: $migration" >&2
    exit 1
  fi

  echo "Applying reviewed migration $migration"
  {
    printf 'begin;\n'
    cat "$migration_path"
    printf "\ninsert into supabase_migrations.schema_migrations (version, name) values ('%s', '%s');\ncommit;\n" "$version" "$name"
  } | core_compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1
  printf '%s %s %s\n' "$version" "$checksum" "$name" >> "$manifest_file"
done

mv "$manifest_file" .deployed-migrations
echo "Self-hosted migration $mode completed without exposing database credentials."
