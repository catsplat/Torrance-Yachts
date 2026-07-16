# Phase 11 development diary

The integration layer was built as one reusable delivery protocol rather than five
independent automations. This made retries, leases, errors, operator visibility,
and idempotency consistent across providers.

The internal calendar was implemented before Google synchronisation. This keeps
the application useful when Google is unavailable and prevents Calendar becoming
an accidental source of truth.

Invoice generation uses the reviewed commission calculation and a versioned
private profile. No AI arithmetic or source-controlled bank details enter the PDF.

n8n was pinned, started locally, and its workflows were imported. A synthetic
workflow completed a real application delivery through claim and callback without
contacting an external provider.
