# Hosted production deployment

The recommended primary topology is:

- managed Supabase Pro for PostgreSQL, Auth, and private Storage;
- one protected Linux VPS for the standalone Next.js container, n8n, ClamAV, and Cloudflare Tunnel;
- an outbound-only Cloudflare Tunnel with Cloudflare Access protecting the private application;
- encrypted logical/database and private-storage exports stored off-site;
- external uptime monitoring against the liveness endpoint and authenticated
  readiness monitoring through n8n.

Vercel Hobby is not an acceptable production host for this commercial internal
application. Supabase Free is suitable for staging only because it can pause and
does not provide downloadable managed backups.

## Server baseline

Use a currently supported Ubuntu LTS or Debian release with:

- at least 2 vCPU, 4 GB RAM, and adequate encrypted disk space;
- Docker Engine and the Compose plugin;
- an SSH key-only administrator account;
- automatic security updates;
- a provider firewall allowing inbound SSH only from an approved administrator
  range; no application, n8n, HTTP, or HTTPS port is exposed from the VPS;
- provider server backups enabled;
- an off-site backup destination in a separate failure domain.

## First deployment

1. Create a client-owned Cloudflare account, private application hostname, Access
   policy, and Tunnel. Configure its single public hostname to route to
   `http://app:3000`; do not create an n8n public hostname.
2. Copy this folder to the server with the repository checkout.
3. Copy `.env.example` to the ignored `.env` and fill every required value.
4. Generate independent high-entropy values for every shared secret and the n8n
   encryption key. Create a company Telegram bot token only if Telegram alerts
   are approved for launch.
5. Set `DEPLOYMENT_VERSION` to the exact Git tag or commit being deployed.
6. Validate the environment contract without printing secret values, then validate
   Compose without starting:

   ```bash
   npm run production:preflight
   docker compose --env-file .env config --quiet
   ```

7. Build and start:

   ```bash
   docker compose --env-file .env up -d --build
   ```

8. Confirm `https://<app-domain>/api/health/live` through an allowed Cloudflare
   Access identity, then create the n8n owner through the protected server
   administration path, import the version-controlled workflows, and run `n8n audit`.
9. Apply migrations to the reviewed production Supabase project through the
   documented CI/release process.
10. Complete every item in `/settings/launch` before entering live data.
11. Each staff member opens `/settings/alerts`, records their own alert routes,
    and connects Gmail only if email alerts or Gmail draft creation are required.

## Deployment and rollback

Deploy only immutable tagged commits. Before deployment, confirm a recent
restorable backup. To roll back:

1. disable provider workflows that could create external work;
2. check out the previously accepted tag;
3. set `DEPLOYMENT_VERSION` to that tag;
4. rebuild and restart the application container;
5. restore the database only when the migration/runbook review says application
   rollback alone is insufficient.

Never roll back PostgreSQL with ad-hoc destructive commands.
