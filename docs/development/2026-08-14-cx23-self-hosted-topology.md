# CX23 self-hosted topology preparation

**Status:** Implemented in source; awaiting a domain, Tunnel, SMTP and staged
synthetic acceptance before it can be called hosted-ready.

The first client-owned Hetzner server is a 4 GB CX23. The existing managed
Supabase production Compose package was intentionally not deployed to it.
Instead, this milestone adds a separately validated lean profile:

1. the essential Supabase services only — PostgreSQL, Kong, Auth, REST and
   private Storage — initialise from one pinned official upstream source;
2. the Next.js app uses the public HTTPS Supabase URL only in the browser and
   a private Kong address only on the server;
3. a bounded application-owned worker executes the existing protected
   automation routes every minute, replacing a production n8n container;
4. ClamAV remains available for the quarantine pipeline; and
5. all services use the same private Docker network without host port mappings.

This is not a reduction in business safeguards. PostgreSQL remains authoritative,
AI remains advisory, and the worker has no external-provider credential. The
trade-off is operational: a small host needs memory/backlog monitoring and an
upgrade trigger during synthetic staging, rather than assuming a 4 GB machine is
unlimited capacity.

The base host has Docker, a protected deployment directory and a non-root
deployment account. It contains no application image, domain, Cloudflare token,
database, email provider, AI provider, client data or operational documents.
