# Phase 6 verification record

**Status:** Accepted as a Phase 6 release candidate

## Automated evidence

- Application lint, TypeScript, and 37 unit tests: passed.
- Production Next.js build including all booking routes: passed.
- Five database suites / 167 assertions: passed.
- High-severity production dependency audit: zero vulnerabilities.
- Clean migration and synthetic seed application: passed; Windows Docker required a stack restart after a transient Storage/DNS health failure.

## Database behaviours verified

- Anonymous and inactive identities cannot read or command booking data.
- Direct booking creation, direct lifecycle bypass, history writes, and deletion are blocked.
- Explicit signed-agreement attestation is mandatory.
- Confirmation creates booking, ±24-hour reservation, pending Yachtfolio action, enquiry transition, history, audit, and durable event.
- Buffered conflicts are detected; lifecycle changes stay synchronised; Yachtfolio completion is explicit and historical.

## Browser acceptance evidence

- Signed in through the individual synthetic local administrator account.
- Approved the synthetic yacht template; created, approved, and recorded externally sent offer `OFF-2026-0009`; no email was sent.
- Progressed `ENQ-2026-0001` through Contract issued and Awaiting signatures with recorded reasons.
- Explicitly attested all-party signatures and confirmed `BKG-2026-0005` from reviewed synthetic agreement facts.
- Verified charter 14–21 August 2026 produced protected reservation 13–22 August 2026.
- Checked a 22–25 August request and received an Unavailable result because its own 21–26 August buffer overlaps the booking.
- Recorded Yachtfolio completion evidence, verified history, reopened it with a reason, and left the operational action visibly pending.
- Verified the live booking on the register, linked enquiry, yacht availability card, and dashboard (one upcoming charter and one pending Yachtfolio action).
- At 390 × 844, document client/scroll widths were both 375 pixels and the complete navigation drawer remained usable.
- Signed out and confirmed direct `/bookings` access returned to `/login`.

The original browser tab retained stale development-module state after a production build rebuilt `.next`; acceptance was repeated in a fresh in-app browser tab against a restarted development server.
