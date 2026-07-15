# Contact directory vertical slice

## Purpose

Phase 3 creates the internal master-data layer needed by enquiries, bookings, email threads, notifications, and the captain-contact task. It supports people, companies, and reviewed yacht responsibilities without introducing any external integration.

## Data flow

```text
Authenticated browser
  -> Next.js contact/company pages
  -> authenticated Server Actions with Zod validation
  -> server-side Supabase client
  -> PostgreSQL grants and Row Level Security
  -> normalisation and actor-attribution triggers
  -> contacts / companies / company_contacts / yacht_contacts
  -> database-owned audit_events
```

Every mutation repeats authentication inside its Server Action. The browser supplies only editable values and record IDs; PostgreSQL resolves access through the signed-in identity and remains the final authorisation boundary.

## Responsibilities

### Contacts

- Name, email, phone, notes, active status, and one or more controlled roles.
- Case-insensitive unique non-null email prevents accidental duplicate identities.
- Roles cover customer, charterer, broker, captain, crew, operations, supplier, and other.

### Companies

- Name, general contact channels, website, notes, and active status.
- Case-insensitive unique name prevents duplicate organisations.

### Company relationships

- Link a contact to a company with job title and primary-company designation.
- A contact may belong to several companies but only one relationship can be primary.

### Yacht relationships

- Link a contact to a yacht as captain, manager, operations, notification recipient, crew, or other.
- Only one primary contact is allowed for each responsibility on each yacht.
- `notifications_enabled` marks eligibility for later routing; it does not trigger delivery.

## Security model

| Capability | Anonymous | Inactive user | Active staff | Administrator |
| --- | ---: | ---: | ---: | ---: |
| Read directory | No | No | Yes | Yes |
| Create/update contacts and companies | No | No | Yes | Yes |
| Hard-delete contacts and companies | No | No | No | Yes |
| Add/update/remove relationships | No | No | Yes | Yes |
| Mutate audit events directly | No | No | No | No |

Foreign keys use `restrict` for people, companies, and yachts. A hard delete therefore cannot silently remove active relationships. The ordinary interface uses the active flag instead of exposing hard deletion.

## Search boundary

Phase 3 queries at most 500 RLS-authorised records and applies normalised text matching in the server component. This avoids embedding untrusted text in PostgREST filter grammar and is proportionate to the expected internal dataset. A database-backed search function becomes mandatory before that bound is insufficient.

## Future consumers

- enquiries link customer, charterer, and broker contacts;
- bookings resolve captain and operations contacts from the selected yacht;
- email ingestion associates senders without duplicating people;
- Telegram and later channels select only reviewed, enabled recipient relationships;
- controlled Sheets synchronisation reads from these authoritative records.
