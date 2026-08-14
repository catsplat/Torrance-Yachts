#!/usr/bin/env bash
set -Eeuo pipefail

# One-time, client-owned Ubuntu VPS preparation for the hosted application.
# Run this only on the intended VPS, as root via sudo, after its host key and
# provider firewall have been reviewed. It deliberately creates no accounts,
# tunnel, application image, database, credentials or business data.

usage() {
  cat <<'EOF'
Usage: sudo ./provision-hosted-vps.sh <deployment-user> [deployment-path]

Example:
  sudo ./provision-hosted-vps.sh torrance /opt/torrance-yachts
EOF
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage >&2
  exit 2
fi

deployment_user=$1
deployment_path=${2:-/opt/torrance-yachts}

case "$deployment_path" in
  /*) ;;
  *) echo "Deployment path must be absolute." >&2; exit 2 ;;
esac

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script through sudo on the target VPS." >&2
  exit 2
fi

if [ "$deployment_user" = "root" ] || ! id "$deployment_user" >/dev/null 2>&1; then
  echo "Deployment user must be an existing non-root Linux account." >&2
  exit 2
fi

. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This reviewed bootstrap currently supports Ubuntu only." >&2
  exit 2
fi

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  printf '%s\n' \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker
if ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends git
fi
systemctl enable --now docker
usermod -aG docker "$deployment_user"

install -d -m 0750 -o "$deployment_user" -g "$deployment_user" "$deployment_path"
install -d -m 0750 -o "$deployment_user" -g "$deployment_user" "$deployment_path/workflows"

if [ ! -e "$deployment_path/.env" ]; then
  install -m 0600 -o "$deployment_user" -g "$deployment_user" /dev/null "$deployment_path/.env"
fi

echo "Hosted VPS base preparation complete."
echo "- Docker: $(docker --version)"
echo "- Deployment directory: $deployment_path"
echo "- Deployment user: $deployment_user (start a new SSH session before using Docker)"
echo "- Secret file: $deployment_path/.env (empty; populate only from approved secret storage)"
echo "No application image, Cloudflare tunnel, database, credentials, ports or business data were configured."
