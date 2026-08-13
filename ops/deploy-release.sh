#!/usr/bin/env sh
set -eu

requested_image=${1:-}
case "$requested_image" in
  ghcr.io/*:v[0-9]*.[0-9]*.[0-9]*|ghcr.io/*@sha256:*) ;;
  *) echo "Refusing non-versioned application image." >&2; exit 2 ;;
esac

test -f .env || { echo "Deployment .env is missing." >&2; exit 2; }
test -f docker-compose.yml || { echo "Production Compose file is missing." >&2; exit 2; }

previous_image=$(grep '^APP_IMAGE=' .env | tail -n 1 | cut -d= -f2- || true)
cp .env .env.deploying
if grep -q '^APP_IMAGE=' .env.deploying; then
  sed "s|^APP_IMAGE=.*$|APP_IMAGE=$requested_image|" .env.deploying > .env.next
else
  cp .env.deploying .env.next
  printf '\nAPP_IMAGE=%s\n' "$requested_image" >> .env.next
fi
chmod 600 .env.next
mv .env.next .env
rm -f .env.deploying

rollback() {
  if [ -n "$previous_image" ]; then
    sed "s|^APP_IMAGE=.*$|APP_IMAGE=$previous_image|" .env > .env.rollback
    chmod 600 .env.rollback
    mv .env.rollback .env
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
printf '%s\n' "$requested_image" > .deployed-image
echo "Deployment healthy: $requested_image"

