# ADR 0013: Managed Supabase plus protected application VPS

**Status:** Accepted as the recommended production topology; external purchase and
commissioning require client approval.

## Decision

Use:

- Supabase Pro for managed PostgreSQL, Auth, private Storage, and daily database
  backups;
- one small protected European Linux VPS for the standalone Next.js application,
  n8n, ClamAV, and an outbound-only Cloudflare Tunnel;
- one Cloudflare Access-protected application hostname and no public n8n hostname;
- encrypted daily logical/database and Storage-object exports to a second failure
  domain;
- a staging project/environment before live mailbox or document activation.

## Why

This keeps the security-sensitive database, authentication, and object storage on
a managed service while avoiding a second commercial application-hosting plan.
The application and n8n are simple long-running containers that suit a small VPS.
The topology supports background work while the employee's Mac is switched off.
ADR 0028 supersedes the former direct Caddy ingress detail while preserving this
managed-Supabase/VPS ownership decision.

Vercel Hobby cannot host this commercial internal application under its current
terms. Supabase Free can pause after inactivity and does not include downloadable
managed backups, so it is staging-only. Relevant primary sources:

- [Vercel plans and commercial-use boundary](https://vercel.com/pricing)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [n8n security audit](https://docs.n8n.io/hosting/securing/security-audit/)

## Cost expectation

Allow roughly £30-45 per month before variable AI usage:

- Supabase Pro begins at USD 25/month;
- VPS, IPv4, and provider backups vary by selected size and current pricing;
- domain registration is annual;
- off-site backup storage is usage-based;
- OpenAI remains optional and usage-based.

Prices must be confirmed at purchase. The original £20 target is not treated as a
reason to use pausing, non-commercial, or non-restorable production tiers.

## Alternatives

Self-hosting the complete Supabase stack on one VPS is cheaper on paper but adds
Auth, Storage, database, upgrade, and disaster-recovery responsibility to a
first-time solo developer. Vercel Pro plus Supabase Pro is operationally simple
but adds another USD 20/month before n8n. A local desktop-only installation cannot
run scheduled automation while the employee computer is off.
