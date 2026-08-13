#!/usr/bin/env sh
set -eu

requested_image=${1:-}
expected_environment=${2:-}

case "$expected_environment" in
  staging|production) ;;
  *) echo "Deployment environment must be staging or production." >&2; exit 2 ;;
esac

case "$requested_image" in
  "ghcr.io/"*":$expected_environment-v"[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "Refusing an image that is not versioned for $expected_environment." >&2; exit 2 ;;
esac

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Production Compose file is missing." >&2; exit 2; }

docker pull "$requested_image"
actual_environment=$(docker image inspect --format '{{index .Config.Labels "io.torrance.environment"}}' "$requested_image")
actual_release=$(docker image inspect --format '{{index .Config.Labels "io.torrance.release-tag"}}' "$requested_image")
requested_release=${requested_image##*:$expected_environment-}

test "$actual_environment" = "$expected_environment" || {
  echo "Image label does not match the requested environment." >&2
  exit 2
}
test "$actual_release" = "$requested_release" || {
  echo "Image label does not match the requested release tag." >&2
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
    docker compose --env-file .env pull app
    docker compose --env-file .env up -d --remove-orphans
  fi
}

trap rollback HUP INT TERM
docker compose --env-file .env config --quiet
docker compose --env-file .env pull
if ! docker compose --env-file .env up -d --remove-orphans --wait --wait-timeout 240; then
  rollback
  echo "Deployment failed health checks and was rolled back." >&2
  exit 1
fi
trap - HUP INT TERM
rm -f .env.previous
printf '%s\n' "$requested_image" > .deployed-image
echo "Deployment healthy: $resolved_image"
