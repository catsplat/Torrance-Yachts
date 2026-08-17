# 2026-08-17 — private pilot first boot

The CX23 private pilot was brought online using the Tailscale-only ingress
profile. This was a first-boot exercise using an empty database volume and no
client records, external provider credentials, or real documents.

## Completed

- started the self-hosted PostgreSQL, Auth, REST, Storage and Kong core on the
  private Docker network;
- applied all reviewed application migrations through the host-side migration
  runner;
- started the pinned application image, application worker, Caddy loopback
  gateway and ClamAV scanner;
- configured Tailscale Serve to proxy only the loopback gateway;
- verified the live health response through the private Tailnet route.

## First-boot correction

The first empty-volume run exposed two legitimate vendor-image requirements:
Vault was not present in the older database image and GoTrue did not own the
baseline `auth` functions. ADR 0049 records the durable bootstrap solution.

## Deliberate limits of this pilot

- access is private to enrolled Tailscale devices; no public domain or
  Cloudflare Tunnel is active;
- the initial administrator setup token stays only in the VPS root-owned
  deployment directory;
- outbound SMTP is intentionally not configured, so invitations and password
  recovery cannot deliver email until the client-approved mail service is
  supplied;
- real Gmail, Telegram, Drive, Calendar, Sheets and AI credentials remain
  unconfigured.

The next acceptance step is to create the first administrator through the
private setup page, enrol MFA, and test the pilot from the client iPhone using
fictional workflow data.
