# Production image build

This directory contains only the Dockerfile used to build immutable Next.js
application images for the hosted service. It intentionally has no runtime
Compose file or environment template.

The only supported runtime profile for the initial Hetzner CX23 is
[`../self-hosted-cx23`](../self-hosted-cx23). It runs the application, worker,
ClamAV, Cloudflare Tunnel and a deliberately lean private Supabase core. That
profile is deployed by the reviewed GitHub workflow; it does not run n8n in
production, publish database ports, or let GitHub Actions connect to PostgreSQL.

Local n8n Community Edition remains a development and rehearsal tool. It is not
part of the hosted deployment package.
