# Private production topology

Prepared and validated the hosted deployment package without connecting a real
Cloudflare, Supabase, Google, Telegram, or AI account.

- Replaced direct public Caddy ingress with an outbound-only Cloudflare Tunnel.
- Removed host port publishing for the application, n8n, and supporting services.
- Kept n8n internal-only; it is not exposed through an application route or a
  public hostname.
- Added capability dropping, `no-new-privileges`, read-only runtime filesystems
  where supported, bounded resources, temporary filesystems, health checks, and
  local log rotation.
- Repaired the lockfile so `npm ci` succeeds in a clean Linux container.

Evidence:

- Production preflight and Compose validation passed with synthetic values only.
- The standalone production application image built successfully from a clean
  Docker environment.
- `npm audit --omit=dev` reported zero runtime vulnerabilities. Full audit
  findings are currently development-tooling-only and are recorded in the Phase
  12 development diary.
