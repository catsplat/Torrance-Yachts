# Development diary: booking and availability

**Date:** 15 July 2026

Phase 6 replaced the placeholder Bookings module with the first authoritative charter record. The central design problem was concurrency: a page-level “check then insert” can allow two users to reserve the same yacht. The solution is a PostgreSQL exclusion constraint inside the same transaction that creates the booking and its operational buffer.

The implementation deliberately separates charter dates from reserved dates and records the one-day buffer visibly. Enquiry status cannot create availability. Booking confirmation requires the enquiry to be awaiting signatures, a matching sent offer, explicit signature attestation, reviewed terms, and a reason.

Controlled amendments were included because real signed terms can require correction; they are available only before charter start, recheck conflicts, and emit a durable amendment event. Yachtfolio was modelled as a separately completed manual action so an internal status change never pretends an external system was updated.

The first full database run caught backwards-compatible error-message expectations and SQL literal type ambiguity. Those were corrected, and all 166 database assertions then passed.
