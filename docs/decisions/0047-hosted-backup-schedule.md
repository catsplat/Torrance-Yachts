# ADR 0047: Guarded daily encrypted backup schedule

**Status:** Accepted for hosted pilot activation
**Date:** 14 August 2026

## Context

The lean CX23 profile already creates encrypted PostgreSQL and private Storage
exports and requires off-site replication in production. A documented manual
command is not a reliable operating control: a small internal team can miss it,
and a failed export needs a clear, non-secret signal.

## Decision

After an operator has configured the public `age` recipient and, in production,
the off-site rclone remote, the VPS enables a checked-in systemd timer. It runs a
non-root, single-instance backup daily with jitter and catch-up after downtime.

The backup writes a restrictive `latest-success.json` record only after the
encrypted artifact and configured off-site copy succeed. A separate freshness
command verifies the record age and local checksum without decrypting data.

The installer refuses incomplete configuration. It does not create cryptographic
keys, configure rclone, delete historical artifacts, upload data to a new
provider, or enable a timer before the operator has completed a manual export.

## Consequences

- Daily logical and document backup is no longer dependent on manual memory.
- A missed/changed local artifact is detectable by a simple monitored command.
- Hetzner disk snapshots remain an additional layer, not the sole recovery plan.
- Retention deletion remains a separately approved policy: this change never
  silently deletes client records or backup archives.
