# ADR 0052: Private loopback-only VPS Studio

**Status:** Accepted  
**Date:** 19 August 2026

## Decision

Run Supabase Studio only as an optional Compose profile on the production VPS,
published solely on the server loopback interface. Administrators use a
key-authenticated SSH tunnel to access it from `http://127.0.0.1:54323` on
their own workstation.

## Rationale

Studio is useful for controlled database and Auth inspection, but it is a
powerful administration surface and does not belong behind the operational app
or a public hostname. A loopback binding plus SSH tunnel avoids a second public
authentication boundary and retains an auditable, revocable SSH-key boundary.

## Consequences

The profile consumes resources only when started. It is intentionally excluded
from Cloudflare, Tailscale Serve and Caddy. PostgreSQL remains private and
operational data remains protected by the existing database roles and RLS.
