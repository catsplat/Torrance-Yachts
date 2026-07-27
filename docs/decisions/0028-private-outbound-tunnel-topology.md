# ADR 0028: Private outbound-only production ingress

## Status

Accepted — 27 July 2026.

## Decision

The hosted edition uses a Cloudflare Tunnel initiated from the VPS. The Compose
stack exposes no host ports for the application, n8n, ClamAV, or tunnel metrics.
Cloudflare Access controls the sole application hostname before an individual
staff member reaches the application login. n8n remains an internal adapter and
is not assigned a public hostname.

Each service has bounded CPU, memory and PID limits, dropped Linux capabilities,
`no-new-privileges`, local log rotation, health checks, and read-only filesystems
where its runtime permits them. Writable state is limited to named data volumes
and explicit temporary filesystems.

## Consequences

- The VPS has no public HTTP(S) ingress to scan or misconfigure.
- Cloudflare ownership and Access policy are client activation requirements, not
  values that can be invented in local development.
- Operational n8n administration requires a protected server-maintenance path;
  it is deliberately not an application route or a public web service.
