# 0043 — Lean self-hosted Supabase on the initial CX23 host

**Date:** 14 August 2026
**Status:** Accepted for staging preparation; not yet live accepted

## Context

The chosen Hetzner CX23 has 4 GB RAM. Torrance Yachts has four or five staff at
most and a strict operating-cost ceiling. A managed Supabase plan would make the
total recurring cost unnecessarily high at this stage.

## Decision

The first hosted topology self-hosts only the required Supabase core on the
client-owned CX23: PostgreSQL, Kong, Auth, REST and private Storage. It omits
Studio, Realtime, Analytics/Logs, Functions, imgproxy and Supavisor. The app,
a small application-owned automation worker, ClamAV and Cloudflare Tunnel run
beside that core on an isolated Docker network. PostgreSQL remains authoritative.

The worker replaces the hosted n8n scheduler only. It invokes the existing
protected application routes using the internal shared secret; it holds no
provider credentials and introduces no business authority. Local n8n remains
available for development rehearsal and is not removed.

The exact official Supabase source revision is pinned by
`ops/bootstrap-selfhosted-supabase.sh`. No host ports are published. Cloudflare
Tunnel will route the private application hostname and Supabase browser API paths
only after the client owns a domain and Tunnel configuration.

## Consequences

- The CX23 must be monitored during synthetic staging acceptance. A memory or
  scanner backlog breach means the host must be upgraded; swap is resilience,
  not capacity.
- Hetzner VM backups do not replace encrypted PostgreSQL-plus-Storage exports
  and restore rehearsals.
- This is suitable for the initial small staff cohort, not a claim that the full
  Supabase stack is generally supported on 4 GB.
- Production activation remains blocked on key generation, SMTP, Cloudflare,
  backup destination, provider setup and staged acceptance.
