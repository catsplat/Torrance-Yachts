# Portfolio case study: conflict-safe yacht bookings

Phase 6 turns a sent offer into an auditable charter booking without allowing a UI status change to reserve a yacht. A human confirms all signatures and reviewed terms; one database transaction creates the booking, applies the required one-day operational buffer, records a pending Yachtfolio action, advances the enquiry, and emits workflow evidence.

The notable engineering decision is a PostgreSQL range exclusion constraint. It prevents overlapping active reservations even if two confirmations arrive concurrently—something a normal pre-save availability query cannot guarantee. Controlled amendments reuse the same constraint, cancellation releases dates, and all consequential changes require reasons and preserve history.

The slice demonstrates domain modelling, transactional invariants, Row Level Security, append-only auditability, server-side validation, responsive operational UI, and automated database behavioural testing using entirely synthetic data.
