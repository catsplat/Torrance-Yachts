# Retention and privacy decision procedure

No destructive production retention job is enabled by default. Before live data,
the client must approve a written schedule for:

- enquiry and email content;
- broker/customer contact records;
- signed contracts and booking records;
- passports and other identity documents;
- KYC/CDD evidence;
- invoices, commission calculations, and payment records;
- notification/provider delivery history;
- security and business audit events;
- backups and exported documents.

For each category record the purpose/legal basis, minimum and maximum retention,
start event, access roles, archive location, deletion/anonymisation method, legal
hold procedure, backup expiry, and approval owner.

Identity/KYC material should be kept only as long as the approved compliance and
banking purpose requires. Financial/contract periods must be confirmed against
the company's accounting and legal obligations. This repository does not invent
those legal decisions.

Deletion must be reviewed, logged, and tested in staging. Backups age out through
their retention schedule rather than being silently edited. Audit events may
retain identifiers while sensitive content is redacted or anonymised according to
the approved policy.
