# Document quarantine and scanning boundary

## Implemented boundary

Uploads enter the private `booking-quarantine` bucket. They are not visible,
verifiable, usable for task completion, or eligible for Drive mirroring while
quarantined. The application records each file as `pending`, obtains upload
capacity for the authenticated user, and validates:

- the 20 MB per-file limit and the per-user hourly/concurrent limits;
- the allow-listed PDF, JPEG, or PNG extension and declared MIME type;
- PDF, JPEG, or PNG file signatures;
- PDF encryption and common active-content markers;
- SHA-256 duplication within the same booking requirement.

The same legitimate file may exist in a different booking. The interface never
reveals cross-booking hash matches.

## Scan and release lifecycle

```text
pending -> scanning -> clean -> released
                    -> infected -> removed from quarantine
                    -> error -> quarantined for retry or rejection
```

ClamAV is reached only through the small INSTREAM scanner adapter. Every attempt
records timestamps, result and a safe failure summary. A clean result is copied
to the separate private `booking-private` bucket and the quarantined object is
removed. The database does not mark the document released until that sequence
completes.

An infected file can never be overridden to clean or released. Its object is
removed while safe metadata and audit evidence remain. A scan error stays in
quarantine. Administrators can retry it, reject/remove it with a reason, or
inspect safe metadata. The reconciliation command repairs interrupted
copy/delete operations and reports orphan candidates.

Private downloads use short-lived signed URLs issued only for released files.
Document verification remains a separate human decision after malware release.
Contract extraction, task completion and Drive mirroring require both the
appropriate released/verified state and the normal booking permission.

## Retention

Document classes receive a retention-review date. The operations screen reports
reviews due but never deletes business or identity records automatically.
Deletion requires an authorised human decision and audit reason. Torrance must
approve the final retention schedule before real identity documents are used.

## Local acceptance

Development uses the pinned ClamAV container in
`automation/docker-compose.yml`. Automated provider tests cover clean,
infected, unavailable and timeout responses; PostgreSQL tests cover state,
permissions, duplicate detection, recovery and release gates. Use fictional
files only until Torrance accepts the scanner and retention policy.
