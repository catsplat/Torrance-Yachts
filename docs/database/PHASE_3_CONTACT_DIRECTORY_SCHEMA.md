# Phase 3 contact-directory schema

The canonical implementation is `supabase/migrations/20260715130000_create_contact_directory.sql`.

## Records

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `contacts` | One record per external person | at least one controlled role; unique non-null email; active lifecycle |
| `companies` | Broker, supplier, yacht-management, and other organisations | unique name; HTTP(S)-only website; active lifecycle |
| `company_contacts` | Person-to-company membership | unique pair; one primary company per contact |
| `yacht_contacts` | Person-to-yacht operational responsibility | unique yacht/contact/responsibility; one primary per yacht responsibility |

Every table contains creator, updater, creation time, and update time. Triggers derive actor fields from `auth.uid()` and prevent clients from rewriting original creation metadata.

## Controlled values

`contact_role`:

- customer
- charterer
- broker
- captain
- crew
- operations
- supplier
- other

`yacht_contact_responsibility`:

- captain
- manager
- operations
- notification recipient
- crew
- other

## Audit behaviour

Successful inserts, updates, and deletes create an `audit_events` row in the same database transaction. Relationship events have their own entity IDs and preserve previous/new values as JSON. Application roles can read authorised audit history but cannot write it directly.

## Deletion behaviour

Contacts, companies, and yachts use restrictive relationship foreign keys. Operational users remove or replace a relationship explicitly and normally deactivate master records. Only an administrator can hard-delete an unlinked contact or company.

## Test coverage

The Phase 3 pgTAP suite covers:

- table and RLS presence;
- anonymous and inactive-user denial;
- active-staff CRUD boundaries;
- multiple roles on one contact;
- duplicate-email prevention;
- primary-company and primary-yacht-responsibility uniqueness;
- attributed relationship audits;
- administrator-only master-record deletion.

Together with Phase 2, the local database suite contains 42 assertions.
