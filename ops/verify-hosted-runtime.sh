#!/usr/bin/env sh
set -eu

expected_environment=${1:-}
expected_release=${2:-}
expected_revision=${3:-}

case "$expected_environment" in
  staging|production) ;;
  *) echo "Runtime verification requires staging or production." >&2; exit 2 ;;
esac

case "$expected_release" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "Runtime verification requires a semantic release tag." >&2; exit 2 ;;
esac

case "$expected_revision" in
  ""|*[!0-9a-f]*) echo "Runtime verification requires a lowercase Git SHA." >&2; exit 2 ;;
esac
test ${#expected_revision} -eq 40 || {
  echo "Runtime verification requires a 40-character Git SHA." >&2
  exit 2
}

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Application Compose file is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }
test -x apply-selfhosted-migrations.sh || { echo "Self-hosted migration script is missing or not executable." >&2; exit 2; }

environment_file_mode=$(stat -c "%a" .env)
test "$environment_file_mode" = "600" || {
  echo "Deployment .env must have mode 600." >&2
  exit 2
}

app_compose() {
  docker compose --env-file .env "$@"
}

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

app_compose config --quiet
core_compose config --quiet

for mapping in "app 3000" "worker 3000" "clamav 3310"; do
  set -- $mapping
  if app_compose port "$1" "$2" >/dev/null 2>&1; then
    echo "Internal service $1 unexpectedly has a host port." >&2
    exit 2
  fi
done

for mapping in "db 5432" "auth 9999" "rest 3000" "storage 5000" "kong 8000"; do
  set -- $mapping
  if core_compose port "$1" "$2" >/dev/null 2>&1; then
    echo "Private Supabase service $1 unexpectedly has a host port." >&2
    exit 2
  fi
done

for service in app worker clamav cloudflared; do
  app_compose ps --status running --services | grep --fixed-strings --line-regexp "$service" >/dev/null || {
    echo "Required service $service is not running." >&2
    exit 1
  }
done

for service in db auth rest storage kong; do
  core_compose ps --status running --services | grep --fixed-strings --line-regexp "$service" >/dev/null || {
    echo "Required private Supabase service $service is not running." >&2
    exit 1
  }
done

deployed_image=$(sed -n 's/^APP_IMAGE=//p' .env | tail -n 1)
case "$deployed_image" in
  ghcr.io/*@sha256:*) ;;
  *) echo "APP_IMAGE is not an immutable registry digest." >&2; exit 2 ;;
esac

actual_environment=$(docker image inspect --format '{{index .Config.Labels "io.torrance.environment"}}' "$deployed_image")
actual_release=$(docker image inspect --format '{{index .Config.Labels "io.torrance.release-tag"}}' "$deployed_image")
actual_revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$deployed_image")

test "$actual_environment" = "$expected_environment" || {
  echo "Deployed image environment does not match the target." >&2
  exit 2
}
test "$actual_release" = "$expected_release" || {
  echo "Deployed image release does not match the requested tag." >&2
  exit 2
}
test "$actual_revision" = "$expected_revision" || {
  echo "Deployed image source revision does not match the reviewed source." >&2
  exit 2
}

app_compose exec -T app wget --quiet --spider http://127.0.0.1:3000/api/health/live
app_compose exec -T clamav clamdscan --ping 1 >/dev/null
core_compose exec -T db pg_isready -U postgres -h localhost >/dev/null
core_compose exec -T auth wget --quiet --spider http://127.0.0.1:9999/health
core_compose exec -T rest postgrest --ready
core_compose exec -T storage wget --quiet --spider http://127.0.0.1:5000/status
core_compose exec -T kong kong health
./apply-selfhosted-migrations.sh verify

echo "Hosted runtime invariants passed: $expected_environment $expected_release $expected_revision $deployed_image"
