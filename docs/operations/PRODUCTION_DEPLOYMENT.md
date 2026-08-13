# Production deployment runbook

## Preconditions

- client-owned managed Supabase project and private hostname exist;
- staging has passed migrations and synthetic acceptance;
- Cloudflare Access identities and the outbound-only Tunnel are approved;
- production SMTP, MFA and disabled public registration are verified;
- a current database and private-Storage backup has passed restore rehearsal;
- the release tag passed CI and has a published GHCR image;
- no live data, credentials or private business values are present in Git.

## GitHub environments

Create protected `staging` and `production` environments. Require a reviewer for
production. Configure these secrets independently in each environment:

- `SUPABASE_DB_URL`
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_HOST_KEY`

Configure `DEPLOY_PATH` as an environment variable. The separate `production`
environment used by the image-publishing workflow also needs browser-safe
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables.
They are compiled into the client bundle by Next.js; no privileged key is used
while building.

## First server provisioning

1. Provision a supported Linux VPS with SSH keys, security updates, UTC time,
   provider backup, and a named recovery administrator.
2. Install Docker Engine and Compose from their vendor packages.
3. Authenticate Docker on the VPS to GHCR using a dedicated read-only package
   credential owned by the client; do not use a developer's broad personal token.
4. Permit inbound SSH only from the approved administration path. Do not expose
   application, n8n, ClamAV, PostgreSQL or Ollama ports.
5. Create `DEPLOY_PATH`, copy `deploy/production/.env.example` to `.env`, set mode
   `600`, and populate it from the approved secret store.
6. Create a client-owned Cloudflare Tunnel whose only public hostname maps to
   `http://app:3000`. Do not publish an n8n hostname.
7. Configure Cloudflare Access as the perimeter layer. Supabase login, approved
   profile, AAL2 MFA, application authorisation and RLS remain mandatory behind it.
8. Seed the n8n owner through the protected administration path. Import only the
   versioned core scheduler and readiness monitor; review before activation.

## Managed Supabase checklist

- apply versioned migrations through the deployment workflow;
- verify every exposed table has RLS and database tests pass;
- configure production SMTP, site URL and exact redirect allow-list;
- disable public registration and enforce the approved invitation flow;
- require TOTP MFA in the application and test recovery administration;
- create private quarantine/released Storage buckets and verify policies;
- verify Vault access is service-only and user OAuth/AI secrets remain isolated;
- configure platform backups/PITR as approved and complete a disposable restore;
- record indexes, database lint, backup evidence and restoration owner.

## Deploy

1. Publish a semantic GitHub Release such as `v0.20.0`. The release workflow builds
   and publishes `ghcr.io/catsplat/torrance-yachts:v0.20.0` plus a source-SHA tag.
2. Start **Deploy approved release** manually, choose the target environment,
   enter the exact version, and confirm the backup.
3. Review the migration dry-run in Actions. Environment approval gates production.
4. The workflow applies migrations, copies the small runtime package, pulls the
   immutable image and waits for container health.
5. Verify Cloudflare Access, login/MFA, `/api/health/live`, authenticated readiness,
   scanner, scheduler, a synthetic notification, and a synthetic workflow.
6. Record the release, image digest, migration list, operator, checks and result.

The VPS never runs `git pull`, `npm install`, `npm run build`, or a development
server.

## Rollback

`deploy-release.sh` automatically restores the previous image when the new stack
fails container health checks. For a later operational rollback, rerun the
deployment workflow with the previously accepted tag after reviewing schema
compatibility. Database migrations use expand/migrate/contract sequencing; never
assume a destructive reverse migration is safe. Restore a database only under the
backup/incident runbook with explicit evidence and authorisation.
