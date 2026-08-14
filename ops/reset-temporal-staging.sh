#!/usr/bin/env sh
set -eu

# One-CX23 staging is deliberately disposable. This command refuses production
# and removes only the Compose volumes declared by the private Supabase core.
# It never deletes the general Docker system, deployment .env, application image
# evidence, ClamAV definitions, or unrelated Docker volumes.

backup_evidence=${1:-}
confirmation=${2:-}

test -n "$backup_evidence" || {
  echo "Provide a non-secret staging backup evidence reference as the first argument." >&2
  exit 2
}
test "$confirmation" = "DESTROY_SYNTHETIC_STAGING" || {
  echo "Refusing reset. Second argument must be DESTROY_SYNTHETIC_STAGING." >&2
  exit 2
}
test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Application Compose file is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }

environment=$(sed -n 's/^APP_ENVIRONMENT=//p' .env | tail -n 1)
domain=$(sed -n 's/^APP_DOMAIN=//p' .env | tail -n 1)
test "$environment" = "staging" || {
  echo "Refusing reset because APP_ENVIRONMENT is not staging." >&2
  exit 2
}
case "$domain" in
  staging.*) ;;
  *) echo "Refusing reset because APP_DOMAIN is not a staging hostname." >&2; exit 2 ;;
esac

app_compose() {
  docker compose --env-file .env "$@"
}

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

app_compose config --quiet
core_compose config --quiet

app_compose down --remove-orphans
core_compose down --volumes --remove-orphans
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$backup_evidence" > .staging-reset-evidence
chmod 600 .staging-reset-evidence
echo "Synthetic staging database and private Storage volumes were removed."
