#!/usr/bin/env bash
set -Eeuo pipefail

# Configure a private HTTPS Tailscale Serve endpoint for the loopback-only
# gateway. Tailscale authentication happens separately with `tailscale up` so
# this script never accepts an auth key or stores a provider credential.

gateway_url=${1:-http://127.0.0.1:3000}

case "$gateway_url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: Tailscale pilot gateway must remain loopback-only." >&2; exit 2 ;;
esac

command -v tailscale >/dev/null || { echo "Tailscale is not installed." >&2; exit 2; }
tailscale status --json >/dev/null

backend_status=$(curl --fail --silent --show-error --max-time 5 "$gateway_url/api/health/live" || true)
test -n "$backend_status" || {
  echo "The local gateway is not healthy at $gateway_url. Start the pilot Compose profile first." >&2
  exit 2
}

tailscale serve --https=443 --bg "$gateway_url"
tailscale serve status
