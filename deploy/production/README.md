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
file. `APP_IMAGE` must be an immutable `vX.Y.Z` GHCR tag or digest.

## Release flow

1. A GitHub Release builds and publishes the immutable image.
2. An administrator starts **Deploy approved release**, selects staging or
   production, enters the release tag, and confirms a current restorable backup.
3. GitHub Actions dry-runs and applies pending Supabase migrations.
4. Only the Compose file, deployment script, and two production n8n workflows are
   copied to the VPS.
5. The VPS pulls images and waits for health checks. Failure restores the prior
   `APP_IMAGE` and restarts it.

The development simulator workflow is deliberately excluded from this package.
Import and activate production n8n workflows only after review; workflow
activation is not silently changed during application deployment.
