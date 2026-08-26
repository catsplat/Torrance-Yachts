#!/usr/bin/env sh
set -eu

requested_image=${1:-}
expected_environment=${2:-}
expected_revision=${3:-}
expected_digest=${4:-}

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

core_compose() {
  docker compose --env-file .env -f supabase-core.compose.yml "$@"
}

app_compose() {
  ingress=$(sed -n 's/^DEPLOYMENT_INGRESS=//p' .env | tail -n 1)
  case "$ingress" in
    cloudflare) docker compose --profile cloudflare --env-file .env "$@" ;;
    tailscale) docker compose --env-file .env -f docker-compose.yml -f docker-compose.tailscale-pilot.yml "$@" ;;
    *) echo "DEPLOYMENT_INGRESS must be cloudflare or tailscale." >&2; exit 2 ;;
  esac
}

docker image inspect "$requested_image" >/dev/null 2>&1 || {
  echo "Approved image is not loaded on the VPS. The deployment workflow must transfer it first." >&2
  exit 2
}
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

case "$expected_digest" in
  ghcr.io/*@sha256:*) ;;
  *) echo "Deployment requires the immutable registry digest recorded by GitHub Actions." >&2; exit 2 ;;
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
replace_setting APP_IMAGE "$requested_image"
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
# The approved image has already been transferred by GitHub Actions.  Do not
# contact a registry from the VPS: the deployment path deliberately requires
# no long-lived registry credential on the host.
if ! app_compose up -d --remove-orphans --wait --wait-timeout 240; then
  rollback
  echo "Deployment failed health checks and was rolled back." >&2
  exit 1
fi
trap - HUP INT TERM
rm -f .env.previous
printf '%s\n' "$expected_digest" > .deployed-image
printf '%s\n' "$expected_revision" > .deployed-revision
echo "Deployment healthy: $expected_digest"
