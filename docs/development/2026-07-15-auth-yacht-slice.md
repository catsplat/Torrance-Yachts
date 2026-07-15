# Development diary: authentication and yacht slice

**Date:** 15 July 2026

**Branch:** `codex/phase-2-auth-yachts`

## Objective

Replace the static yacht placeholder with the smallest complete operational slice: a real internal identity, protected application navigation, database-authorised yacht records, safe mutations, and auditable history.

## Work completed

- Added a reproducible local Supabase stack instead of creating an undocumented cloud dependency.
- Designed identity, yacht, and audit tables as a forward-compatible base for the full brief.
- Added database constraints and Row Level Security before exposing forms.
- Built protected sign-in/sign-out and active-profile resolution.
- Replaced the yacht placeholder with list, create, detail, and edit screens.
- Added per-yacht operational phone routing from the original sketch.
- Added server validation and database audit triggers.
- Added unit, RLS, schema-lint, CI, mobile, and end-to-end manual checks.

## Important reasoning

### Individual identities instead of a shared password

Even with one initial user, individual accounts provide attribution and make later staff access safe without rebuilding authentication. Supabase supplies password security, while PostgreSQL policies keep access rules close to the data.

### Availability is not a yacht status

The sketch asks to show yacht booked dates and prevent conflicting enquiries. Storing an `available` switch now would create a second, unreliable source of truth. This slice stores operational lifecycle only; booking periods will determine availability later.

### Audit in the database

If the page itself wrote audit records, a future API or automation could forget them. A database trigger guarantees the same record for every successful yacht mutation.

### Local-first service setup

Local Supabase proves migrations and permissions without monthly cost, production credentials, or live data. Hosted deployment remains an explicit later gate.

## Problems found and resolved

- Supabase has separate global and email-provider signup settings. Public registration stays globally disabled while the email provider remains enabled for administrator-created identities.
- Initial role bootstrapping conflicted with the self-escalation trigger. Trusted database roles now have a narrowly documented bootstrap path; application users remain restricted.
- The pgTAP runner needed the same custom Docker network used by the locally bound stack. The npm test script now supplies that network explicitly, while CI uses its isolated default network.
- User-facing dashboard identity originally remained synthetic. It now derives the verified active profile and shows the signed-in employee.
- Docker Desktop on Windows still displayed some Supabase ports as bound to `0.0.0.0` despite the official custom-network option. The setup now requires explicit port verification, trusted/private networking, the host firewall, synthetic-only data, and stopping the stack when idle.

## Scope deliberately deferred

- hosted production setup;
- invitation, password-recovery, and user-management screens;
- yacht document storage and public brochure-link policy;
- captain contact records;
- bookings, date buffers, and Yachtfolio update tasks;
- Telegram, email, Sheets, calendar, n8n, and AI integration.

These are not omissions from the architecture. They are later vertical slices that depend on the identity and yacht boundaries proved here.
