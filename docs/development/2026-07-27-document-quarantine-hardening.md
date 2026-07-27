# Document quarantine and malware-scanning hardening

## Outcome

Document upload moved from direct private release to a fail-closed pipeline:

```text
untrusted file -> signature validation -> private quarantine -> ClamAV
  -> clean -> protected storage -> human verification -> optional Drive copy
```

Files which are malformed, active-content PDFs, infected or unable to be scanned
cannot receive a signed URL, satisfy a booking-document requirement, be used for
contract review, or be copied to Google Drive.

## Verification evidence

- Application validation covers unsupported types, fake MIME declarations and
  active-content PDF markers.
- Local ClamAV acceptance covers both a benign synthetic PDF payload and the
  standard EICAR antivirus signature.
- PostgreSQL tests cover quarantine registration, scanner state, release,
  requirement progression and the rejected pre-release review path.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run db:test`,
  `npm run build`, and `npm run db:lint` pass at this milestone.

## Operating note

Run `npm run automation:start` before testing uploads locally. ClamAV exposes
only `127.0.0.1:3310`; it is not an internet-facing service.
