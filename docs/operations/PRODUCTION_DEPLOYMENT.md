# Production deployment runbook

## Preconditions

- client approves the topology, recurring costs, domain, and named infrastructure
  owner;
- client-owned Supabase Pro project exists in the accepted region;
- a staging project has passed migrations and synthetic acceptance;
- DNS is client-owned;
- a recent backup and restore test exists;
- no live data is present in development or Git.

## Deployment

1. Provision a supported Linux VPS with provider firewall and backups.
2. Configure SSH keys, automatic security updates, UTC system time, and a named
   secondary recovery administrator.
3. Install Docker Engine and Compose from the vendor repository.
4. Clone the private repository at an immutable release tag.
5. Populate `deploy/production/.env` from secret storage.
6. Apply database migrations to staging, run acceptance, then apply to production.
7. Run `docker compose config --quiet`.
8. Start the tagged image, n8n, ClamAV, and Cloudflare Tunnel stack. No application
   or n8n container port may be published on the VPS.
9. Verify the Cloudflare Access policy, HTTPS, security headers, login, liveness,
   authenticated readiness, protected n8n owner access, and disabled workflows.
10. Set a temporary high-entropy `INITIAL_ADMIN_SETUP_TOKEN`, create the named
    first administrator at `/setup`, remove the token, restart the app, and
    confirm setup is closed.
11. Configure production SMTP and provider credentials with minimum scopes.
12. Follow `EMAIL_AND_INTEGRATION_ACTIVATION.md`, inspect `/settings/activation`,
    and confirm secret values never appear in the interface or logs.
13. Import workflows, run `n8n audit`, execute synthetic provider tests, and
    activate one workflow at a time.
14. Complete `/settings/launch`; live data remains prohibited until final client
   sign-off.

## Release

Every production version requires a pull request, passing CI, semantic tag,
changelog, database migration review, backup confirmation, rollback decision, and
recorded deployment owner.
