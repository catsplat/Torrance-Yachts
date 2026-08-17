# Tailscale private pilot

This is a temporary, private ingress route while the client-controlled domain
is pending. It is not a public demo link and it does not expose the VPS's
database, Supabase Studio, Storage, ClamAV or worker.

## 1. Authorise the VPS

Tailscale is installed as the operating-system service on the VPS. The operator
runs the one-time `tailscale up` command and completes the displayed
Tailscale sign-in URL using the client-controlled tailnet. Do not use an auth
key in chat, Git or a shell history.

Approve only the VPS and the named staff devices. The first client needs the
Tailscale desktop app on macOS and the mobile app if they will open Telegram
review links on their phone.

## 2. Start the private gateway

From the protected deployment directory, start the application with its normal
Compose file plus the pilot override:

```sh
docker compose --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.tailscale-pilot.yml \
  up -d --wait
```

The override maps the gateway to `127.0.0.1:3000` only. Verify from the VPS:

```sh
curl --fail http://127.0.0.1:3000/api/health/live
./configure-tailscale-pilot.sh
```

The latter prints the only HTTPS address that pilot users should use. It is
available inside the approved tailnet only.

## 3. Pilot boundaries

- Use fictional records until the backup, authentication and staff walkthrough
  are accepted.
- Keep the Hetzner firewall restricted to administrative SSH; do not open HTTP,
  HTTPS, PostgreSQL, Supabase or Docker ports.
- The Tailscale layer supplements rather than bypasses password login, approved
  staff status, MFA, application audit history or RLS.
- Do not configure production Google OAuth callbacks until they have been
  tested against the final approved origin.

## 4. Replace or remove

When the Cloudflare domain becomes active, deploy the normal Cloudflare profile,
test Access and the full synthetic workflow, then remove the private endpoint:

```sh
sudo tailscale serve off
sudo tailscale logout
```

Finally remove the VPS device from the tailnet administration console.
