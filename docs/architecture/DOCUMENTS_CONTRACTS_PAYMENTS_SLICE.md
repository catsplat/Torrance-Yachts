# Phase 8 architecture

```text
Authenticated upload
  -> private booking bucket
  -> controlled metadata command
  -> pending human verification
  -> verified charter agreement
  -> reviewed contract-field draft
  -> explicit approval
  -> payment schedule + deterministic commission
  -> booking/task dates updated atomically
```

PostgreSQL remains authoritative. Storage paths are opaque and booking-scoped.
The application creates five-minute signed download links on the server and never
stores a public URL.

The first booking checklist contains six document requirements: signed charter
agreement, broker KYC statement, client passport, CDD check, Kylian commission
invoice, and an optional broker commission invoice.
