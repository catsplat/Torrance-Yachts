#!/usr/bin/env sh
set -eu

requested_image=${1:-}
expected_environment=${2:-}
expected_revision=${3:-}

case "$expected_environment" in
  staging|production) ;;
  *) echo "Deployment environment must be staging or production." >&2; exit 2 ;;
esac

case "$requested_image" in
  "ghcr.io/"*":$expected_environment-v"[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "Refusing an image that is not versioned for $expected_environment." >&2; exit 2 ;;
esac

case "$expected_revision" in
  ""|*[!0-9a-f]*) echo "Expected source revision must be a lowercase Git SHA." >&2; exit 2 ;;
esac
test ${#expected_revision} -eq 40 || {
  echo "Expected source revision must be a 40-character Git SHA." >&2
  exit 2
}

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Application Compose file is missing." >&2; exit 2; }
test -f supabase-core.compose.yml || { echo "Self-hosted Supabase Compose file is missing." >&2; exit 2; }
test -x apply-selfhosted-migrations.sh || { echo "Self-hosted migration script is missing or not executable." >&2; exit 2; }

ghcr_username=$(sed -n 's/^GHCR_USERNAME=//p' .env | tail -n 1)
ghcr_pull_token=$(sed -n 's/^GHCR_PULL_TOKEN=//p' .env | tail -n 1)
test -n "$ghcr_username" || { echo "GHCR_USERNAME is missing from the protected deployment environment." >&2; exit 2; }
test -n "$ghcr_pull_token" || { echo "GHCR_PULL_TOKEN is missing from the protected deployment environment." >&2; exit 2; }

registry_auth_dir=$(mktemp -d)
cleanup_registry_auth() {
  rm -rf "$registry_auth_dir"
}
trap cleanup_registry_auth EXIT
printf '%s' "$ghcr_pull_token" | DOCKER_CONFIG="$registry_auth_dir" docker login ghcr.io --username "$ghcr_username" --password-stdin >/dev/null
unset ghcr_pull_token

registry_docker() {
  DOCKER_CONFIG="$registry_auth_dir" docker "$@"
}

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

app_compose() {
  docker compose --env-file .env "$@"
}

registry_docker pull "$requested_image"
actual_environment=$(docker image inspect --format '{{index .Config.Labels "io.torrance.environment"}}' "$requested_image")
actual_release=$(docker image inspect --format '{{index .Config.Labels "io.torrance.release-tag"}}' "$requested_image")
actual_revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$requested_image")
requested_release=${requested_image##*:$expected_environment-}

test "$actual_environment" = "$expected_environment" || {
  echo "Image label does not match the requested environment." >&2
  exit 2
}
test "$actual_release" = "$requested_release" || {
  echo "Image label does not match the requested release tag." >&2
  exit 2
}
test "$actual_revision" = "$expected_revision" || {
  echo "Image source revision does not match the reviewed release tag." >&2
  exit 2
}

resolved_image=$(docker image inspect --format '{{index .RepoDigests 0}}' "$requested_image")
case "$resolved_image" in
  ghcr.io/*@sha256:*) ;;
  *) echo "Registry did not return an immutable image digest." >&2; exit 2 ;;
esac

cp .env .env.previous
cp .env.previous .env.next
replace_setting() {
  setting_name=$1
  setting_value=$2
  if grep -q "^$setting_name=" .env.next; then
    sed "s|^$setting_name=.*$|$setting_name=$setting_value|" .env.next > .env.replace
    mv .env.replace .env.next
  else
    printf '\n%s=%s\n' "$setting_name" "$setting_value" >> .env.next
  fi
}
replace_setting APP_IMAGE "$resolved_image"
replace_setting APP_ENVIRONMENT "$expected_environment"
replace_setting DEPLOYMENT_IMAGE_ENVIRONMENT "$expected_environment"
replace_setting DEPLOYMENT_VERSION "$requested_release"
chmod 600 .env.next
mv .env.next .env

rollback() {
  if [ -f .env.previous ]; then
    cp .env.previous .env
    chmod 600 .env
    previous_image=$(sed -n 's/^APP_IMAGE=//p' .env | tail -n 1)
    case "$previous_image" in
      ghcr.io/*@sha256:*)
        registry_docker compose --env-file .env pull app
        app_compose up -d --remove-orphans
        ;;
      *)
        echo "No prior immutable application image exists; retained the private Supabase core for diagnosis." >&2
        ;;
    esac
  fi
}

# Supabase is started only on the private Docker network. The source migration
# directory is staged by GitHub Actions and applied here, never from a public
# runner that would need database access.
core_compose config --quiet
core_compose up -d --wait --wait-timeout 240
./apply-selfhosted-migrations.sh apply

trap rollback HUP INT TERM
app_compose config --quiet
registry_docker compose --env-file .env pull
if ! app_compose up -d --remove-orphans --wait --wait-timeout 240; then
  rollback
  echo "Deployment failed health checks and was rolled back." >&2
  exit 1
fi
trap - HUP INT TERM
rm -f .env.previous
printf '%s\n' "$requested_image" > .deployed-image
printf '%s\n' "$expected_revision" > .deployed-revision
echo "Deployment healthy: $resolved_image"
