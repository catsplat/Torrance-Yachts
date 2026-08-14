#!/usr/bin/env bash
set -Eeuo pipefail

# Creates a pinned, minimal Supabase core from the official source. It neither
# publishes ports nor creates business data. Run as the non-root deployment
# user after copying the real .env into the deployment directory.

deployment_path=${1:-/opt/torrance-yachts}
supabase_revision="86854671e95be31e24fa0785cded0579fe692fcb"
source_url="https://github.com/supabase/supabase.git"
source_path="$deployment_path/supabase-upstream"

test "$(id -u)" -ne 0 || { echo "Run as the non-root deployment user." >&2; exit 2; }
test -f "$deployment_path/.env" || { echo "Missing $deployment_path/.env." >&2; exit 2; }
command -v git >/dev/null || { echo "git is required for the pinned official Supabase source." >&2; exit 2; }

if [ ! -s "$deployment_path/.env" ]; then
  cp "$deployment_path/self-hosted-cx23.env.example" "$deployment_path/.env"
  chmod 600 "$deployment_path/.env"
fi

if [ ! -d "$source_path/.git" ]; then
  git clone --filter=blob:none --no-checkout "$source_url" "$source_path"
fi
git -C "$source_path" fetch --depth 1 origin "$supabase_revision"
git -C "$source_path" checkout --detach "$supabase_revision"
test "$(git -C "$source_path" rev-parse HEAD)" = "$supabase_revision"

install -d -m 0750 "$deployment_path/supabase"
if [ ! -d "$deployment_path/supabase/volumes" ]; then
  cp -R "$source_path/docker/volumes" "$deployment_path/supabase/"
fi
chmod -R go-rwx "$deployment_path/supabase/volumes"

if ! grep -q '^JWT_SECRET=.' "$deployment_path/.env"; then
  (
    cd "$deployment_path"
    sh "$source_path/docker/utils/generate-keys.sh" --update-env >/dev/null
  )
fi

set_value() {
  key=$1
  value=$2
  if grep -q "^${key}=" "$deployment_path/.env"; then
    sed -i "s|^${key}=.*$|${key}=${value}|" "$deployment_path/.env"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$deployment_path/.env"
  fi
}
anon_key=$(sed -n 's/^ANON_KEY=//p' "$deployment_path/.env" | tail -n 1)
service_key=$(sed -n 's/^SERVICE_ROLE_KEY=//p' "$deployment_path/.env" | tail -n 1)
set_value NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$anon_key"
set_value SUPABASE_SECRET_KEY "$service_key"
chmod 600 "$deployment_path/.env"
docker network inspect torrance-internal >/dev/null 2>&1 || docker network create torrance-internal >/dev/null

cp "$deployment_path/self-hosted-supabase-core.compose.yml" "$deployment_path/supabase-core.compose.yml"

cat <<'EOF'
Pinned Supabase files prepared. Do not run the upstream full stack on a CX23.
Secrets were generated only on the protected VPS file where required. Complete
the real SMTP, hostname, Google and Cloudflare values, then start only the
reviewed core with:
  docker compose --env-file .env -f supabase-core.compose.yml up -d --wait
Studio, Realtime, Analytics/Logs, Functions, imgproxy and Supavisor stay
disabled on this host.
EOF
