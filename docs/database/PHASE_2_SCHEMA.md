# Phase 2 database schema

The canonical implementation is migration `supabase/migrations/20260715120000_create_identity_and_yachts.sql`. This document explains intent; it does not replace the migration.

## Tables

### `profiles`

One-to-one extension of `auth.users` for internal application identity.

Important fields: display name, normalised email, optional phone and Telegram chat ID, `administrator`/`staff` role, active status, and timestamps.

An authentication trigger creates every profile as `staff`. Role and active-status fields cannot be changed by an ordinary user, including through a self-profile update.

### `yachts`

The authoritative operational yacht register. It includes identity, dimensions, capacities, speeds, ports, operational notification phone, lifecycle status, notes, and creator/updater attribution.

`status` describes whether a yacht record is active, inactive, or under maintenance. It is not charter availability. Availability will be calculated from accepted booking periods and their required buffers.

### `audit_events`

Append-only history for yacht changes. It records actor, operation, entity, previous/new JSON values, source, and time. Application users receive `select` only.

## Access matrix

| Operation | Anonymous | Inactive user | Active staff | Active administrator |
| --- | ---: | ---: | ---: | ---: |
| Read profiles | No | No | Yes | Yes |
| Edit own non-authorisation profile fields | No | No | Yes | Yes |
| Change roles or active status | No | No | No | Yes |
| Read/create/update yachts | No | No | Yes | Yes |
| Delete yachts | No | No | No | Yes |
| Read audit events | No | No | Yes | Yes |
| Mutate audit events directly | No | No | No | No |

## Database invariants

- Yacht names and profile emails are case-insensitively unique.
- Profile emails are stored lower-case.
- Numeric yacht specifications must be positive and realistically bounded.
- Maximum speed cannot be below cruise speed.
- Record identity and original creation metadata cannot be rewritten during an update.
- Roles and active status cannot be self-elevated.
- Yacht actor attribution is derived from `auth.uid()`.
- Each successful yacht mutation produces an audit event.

## Testing

The pgTAP suite provisions temporary synthetic identities and exercises the real RLS context. Its 14 assertions cover table/RLS presence, anonymous denial, staff read/write permissions, administrator-only deletion, audit attribution, and immediate revocation for inactive staff.

Run:

```powershell
npm run db:test
npm run db:lint
```

## Data classification

Phase 2 seed rows are obviously synthetic. Do not add live captain phones, owner details, charter rates, or document links to seeds, migrations, examples, screenshots, or test fixtures.
