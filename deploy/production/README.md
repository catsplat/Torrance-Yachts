# Hosted production package

This directory is the complete runtime package copied to the Linux VPS. The VPS
does not clone the source repository and does not build application code.

## Runtime topology

- `app`: immutable Next.js image from GHCR;
- `n8n`: pinned scheduler/orchestration image with no Google or Telegram credentials;
- `clamav`: server-side quarantine scanner;
- `cloudflared`: outbound-only private ingress to `http://app:3000`.

No service publishes a host port. Managed Supabase provides PostgreSQL, Auth,
Storage and Vault.

## Files on the VPS

```text
<DEPLOY_PATH>/
  .env                 # mode 600; created by the operator, never copied from Git
  docker-compose.yml   # copied by the deployment workflow
  deploy-release.sh    # copied by the deployment workflow
  workflows/           # production scheduler and readiness monitor only
```

Copy `.env.example` to the approved secret manager or directly to the protected
VPS as a starting contract. Populate it there; never commit or upload the filled
file. Before first deploy, the workflow will replace `APP_IMAGE` with a verified
immutable digest. Its requested image must be an environment-prefixed semantic
GHCR tag, for example `staging-v0.19.1`; `DEPLOYMENT_IMAGE_ENVIRONMENT` must
match `APP_ENVIRONMENT`.

## Release flow

1. A reviewed semantic source tag is built separately by **Build approved
   environment image** for `staging` or `production`. Browser-safe Supabase
   configuration is compiled for that environment only.
2. An administrator starts **Deploy approved release**, selects the matching
   environment, enters the source tag, and confirms a current restorable backup.
3. GitHub Actions rejects an image that is unversioned or intended for the other
   environment, then dry-runs and applies pending Supabase migrations.
4. Only the Compose file, deployment script, and two production n8n workflows are
   copied to the VPS. The script verifies image labels and replaces the requested
   tag with its immutable digest in the protected `.env` file.
5. The VPS pulls images and waits for health checks. Failure restores the prior
   `.env`, digest and stack.

The development simulator workflow is deliberately excluded from this package.
Import and activate production n8n workflows only after review; workflow
activation is not silently changed during application deployment.
