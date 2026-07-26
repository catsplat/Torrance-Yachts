# Document quarantine and scanning boundary

## Current local rule

Local development accepts only clearly fictional PDF, JPEG, and PNG files up
to 20 MB. The app validates the supplied MIME type and size, stores accepted
files in the private `booking-private` bucket, records a pending-review
document row, and removes the stored object if registration is rejected.

Private downloads use short-lived signed URLs. A document cannot be used for
contract review until a human verifies it. A rejected document remains visible
with its recorded reason; it does not become an approved source.

This is an upload-validation boundary, **not malware scanning**. Do not upload
real passports, KYC, CDD reports, signed client agreements, or financial files
to the local rehearsal environment.

## Production gate

Before real files are accepted, the client must approve all of the following:

1. A managed antivirus or content-scanning service that runs before a file can
   be made available to staff or copied to Drive.
2. A quarantine location with no user-download permission until scan verdict
   and metadata validation succeed.
3. A documented allow-list based on detected content type, not only the browser
   supplied MIME type or filename extension.
4. Explicit retention/deletion schedules by document class, legal basis,
   access role, and incident response process.
5. An operator procedure for failed scans, false positives, replacements,
   access review, and evidence preservation.

Until this gate is signed off, the application remains suitable only for
fictional local files and implementation rehearsal.
