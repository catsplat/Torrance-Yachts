# Production deployment runbook

## Preconditions

- client-owned private hostname, Cloudflare account and approved backup destination exist;
- staging has passed migrations and synthetic acceptance;
- Cloudflare Access identities and the outbound-only Tunnel are approved;
- production SMTP, MFA and disabled public registration are verified;
- a current database and private-Storage backup has passed restore rehearsal;
- the source tag passed CI; the target environment image will be built from that
  exact tag;
- no live data, credentials or private business values are present in Git.

## First-host staging on one CX23

The initial budget includes one VPS. Follow the synthetic-staging process in
[ADR 0046](../decisions/0046-single-vps-temporal-staging.md): deploy the
environment-specific staging image to `staging.<approved-domain>`, accept it
using fictional data only, then take a final evidence backup and reset database
and Storage volumes before building and deploying the separate production image
to the approved production hostname. Never run staging and production against
the same database or browser-safe Supabase configuration.

After independently confirming the staging backup/restore evidence, the
authorised VPS operator records its safe evidence reference and runs:

```sh
./reset-temporal-staging.sh "<backup-evidence-reference>" DESTROY_SYNTHETIC_STAGING
```

The script refuses any non-staging environment or hostname and removes only the
private Supabase database/Storage Compose volumes. It does not reset production
and does not remove the protected runtime `.env` file.

## GitHub environments

Create protected `staging` and `production` environments. Require a reviewer for
production. Configure these secrets independently in each environment:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_HOST_KEY`

Configure `DEPLOY_PATH` as an environment variable. Both environments also
need their own browser-safe `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables for the image-publishing
workflow. They are compiled into the client bundle by Next.js; no privileged
key is used while building. Never reuse the production values in `staging`.

## First server provisioning

1. Provision a supported Linux VPS with SSH keys, security updates, UTC time,
   provider backup, and a named recovery administrator.
2. Install Docker Engine and Compose from their vendor packages.
3. Do not authenticate Docker on the VPS to GHCR. The reviewed deployment
   workflow transfers the accepted image from GitHub Actions and records its
   immutable registry digest on the host.
4. Permit inbound SSH only from the approved administration path. Do not expose
   application, scheduler, ClamAV, PostgreSQL or Ollama ports.
5. Create `DEPLOY_PATH`, copy `deploy/self-hosted-cx23/.env.example` to `.env`,
   set mode `600`, and populate it from the approved secret store.
6. Create a client-owned Cloudflare Tunnel whose only public hostname maps to
   `http://gateway:8080`. The private gateway routes application traffic and
   the browser-facing Supabase API while Kong itself remains private. Do not
   publish any internal service hostname.
7. Configure Cloudflare Access as the perimeter layer. Supabase login, approved
   profile, AAL2 MFA, application authorisation and RLS remain mandatory behind it.
8. Configure the application-owned scheduler with its protected automation
   secret. Leave it disabled until the staged synthetic workflow is accepted.

The idempotent Ubuntu preparation command and the exact secret/account handoff
are maintained in [Hosted activation handoff](HOSTED_ACTIVATION_HANDOFF.md).

## Self-hosted Supabase CX23 checklist

The initial Hetzner CX23 is deliberately constrained to the essential Supabase
core. Run `ops/bootstrap-selfhosted-supabase.sh` as the non-root deployment user
to obtain the exact pinned upstream source and create the private baseline.
Never start the full upstream Compose stack on this host. The release profile
starts only PostgreSQL, Kong, Auth, REST and Storage, alongside the application,
worker, ClamAV and Cloudflare Tunnel. Studio, Realtime, Analytics/Logs,
Functions, imgproxy and Supavisor are intentionally absent.

The app's browser configuration must use the private HTTPS hostname. Server-side
database traffic uses `http://kong:8000` on the private `torrance-internal`
Docker network so it does not loop back through Cloudflare Access.

- create Supabase Auth/JWT keys only on the VPS secret file; never in Git;

- apply versioned migrations from the reviewed release against the self-hosted database;
- verify every exposed table has RLS and database tests pass;
- configure production SMTP, site URL and exact redirect allow-list;
- disable public registration and enforce the approved invitation flow;
- require TOTP MFA in the application and test recovery administration;
- create private quarantine/released Storage buckets and verify policies;
- verify Vault access is service-only and user OAuth/AI secrets remain isolated;
- configure encrypted database and Storage exports in addition to Hetzner Backups, then complete a disposable restore;
- after a manual encrypted export and checksum check, enable the reviewed
  non-root daily `torrance-yachts-backup.timer` and verify it with the freshness
  command in the backup runbook;
- record indexes, database lint, backup evidence and restoration owner.

## Deploy

1. Create a semantic source tag and GitHub Release such as `v0.19.1` only after
   its pull request CI is green. This identifies reviewed source; it does not
   automatically make a deployable image.
2. Run **Build approved environment image**, select `staging`, and enter the
   source tag. It must publish
   `ghcr.io/catsplat/torrance-yachts:staging-v0.19.1` and its recorded digest.
3. Start **Deploy approved release** for `staging`, enter the same source tag,
   and confirm the backup. The workflow rejects an unversioned, mutable, or
   cross-environment image before copying any runtime package.
4. The workflow copies the reviewed migration directory and small runtime
   package to the VPS. The private host starts its lean Supabase core and applies
   pending SQL migrations through its local `db` container—GitHub Actions never
   receives a PostgreSQL connection string. It then confirms image labels match
   the exact reviewed Git revision, resolves the verified image to a digest and
   waits for container health.
5. The target-side verifier then confirms that the deployment `.env` remains
   mode `600`, App/worker/ClamAV and the private Supabase services have no
   published host ports, all expected containers are running, the immutable
   digest retains the expected OCI labels, all reviewed migrations are present,
   and internal App/ClamAV/Supabase health endpoints respond.
6. Verify Cloudflare Access, login/MFA, `/api/health/live`, authenticated
   readiness, scanner, scheduler, a synthetic notification, and a synthetic
   workflow. Record the image digest, migration list, operator, checks and
   result as staging evidence.
7. Only after staged provider checks and staff acceptance, repeat the image
   build for `production` from the *same* source tag. Deploy
   `production-v0.19.1` with the production approval gate and repeat the
   documented checks.

The VPS never runs `git pull`, `npm install`, `npm run build`, or a development
server.

## Rollback

`deploy-release.sh` automatically restores the previous immutable digest when
the new stack fails container health checks. For a later operational rollback,
rerun the deployment workflow with a previously accepted tag for the *same*
environment after reviewing schema compatibility. Database migrations use
expand/migrate/contract sequencing; never assume a destructive reverse migration
is safe. Restore a database only under the backup/incident runbook with explicit
evidence and authorisation.
