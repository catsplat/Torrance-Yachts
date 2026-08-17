# 0048 — Private Tailscale pilot ingress

**Date:** 17 August 2026
**Status:** Accepted for a limited client pilot while the client-controlled domain remains pending

## Context

The private hosted application needs a stable HTTPS origin for browser sessions,
Supabase Auth redirects and secure review links. The selected Cloudflare Tunnel
and Access topology requires a client-controlled DNS zone. The requested
EU.org delegation remains pending, so it must not block a fictional-data pilot
with the initial client.

## Decision

Install Tailscale on the VPS and use `tailscale serve` to proxy only the host's
loopback gateway. The gateway routes application traffic to Next.js and the
browser-facing Supabase paths to Kong on the private Docker network. It has no
public host port and Tailscale access policy is an additional perimeter layer;
the application login, access approval, MFA and RLS remain mandatory.

The pilot is reachable only from approved devices in the client tailnet at the
Tailscale HTTPS hostname. Tailscale OAuth/identity does not replace the
application's staff identities. The separate Cloudflare profile remains the
long-term production ingress once a client-controlled domain is active.

## Consequences

- The initial client must install Tailscale on every device used to access the
  pilot, including a phone that follows secure Telegram review links.
- A single gateway prevents the browser from needing a second public Supabase
  hostname and keeps Kong private.
- The pilot requires no inbound application, database, Storage, scanner or
  worker ports on the VPS.
- Google OAuth and other providers must be configured only after their exact
  Tailscale callback behaviour is accepted; password/MFA access remains the
  baseline pilot path.
- The Tailscale device is removed from the tailnet and `tailscale serve off`
  is run when Cloudflare Access replaces this pilot ingress.
