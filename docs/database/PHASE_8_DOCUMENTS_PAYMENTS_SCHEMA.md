# Phase 8 database schema

Phase 8 adds:

- `booking_document_requirements`
- `documents`
- `document_history`
- `contract_reviews`
- `payment_schedules`
- `commission_calculations`

All operational tables use RLS and expose reads only to active authenticated staff.
Writes are available only through security-definer commands that re-check the
active internal identity. Direct table mutation is not granted.

The `booking-private` storage bucket is non-public, accepts PDF/JPEG/PNG only, and
limits files to 20 MB. Object policies require an active staff identity and a valid
booking-scoped path.
