# Private VPS Supabase Studio

## Purpose

The production database remains private. Supabase Studio is an optional
administrative interface for inspecting schemas, data and Auth state; it is
not part of the Torrance Yachts application and must never be published through
the public app URL, Caddy, Cloudflare Tunnel or Tailscale Serve.

Studio is an on-demand Docker Compose profile bound to `127.0.0.1:54323` on
the VPS. An administrator reaches it only through an SSH tunnel authenticated
with their deployment key.

## Open Studio from Windows

From the repository root in PowerShell:

```powershell
.\ops\open-vps-studio.ps1 `
  -HostName 100.75.92.123 `
  -IdentityFile "$env:USERPROFILE\.ssh\torrance_yachts_hetzner"
```

Keep that PowerShell window open, then browse to:

`http://127.0.0.1:54323`

The URL is local to your own computer. It is not an internet address and cannot
be opened by another person unless they possess an authorised SSH key and can
reach the VPS.

## Stop it afterwards

Close the tunnel, then run:

```powershell
ssh -i "$env:USERPROFILE\.ssh\torrance_yachts_hetzner" torrance@100.75.92.123 `
  "cd /opt/torrance-yachts && docker compose --env-file .env -f supabase-core.compose.yml --profile studio stop studio meta"
```

Stopping Studio does not stop PostgreSQL, Auth, Storage or the Torrance Yachts
application and does not change data.

## Security boundary

- Studio has no public port and no Caddy/Tailscale/Cloudflare route.
- The Docker network is private and PostgreSQL still has no published port.
- The Studio encryption key is generated only in the VPS `.env` file with mode
  `600`; it is never committed.
- Restrict SSH keys to approved administrators and remove a key immediately if
  a device is lost.
