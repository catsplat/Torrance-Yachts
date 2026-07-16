# Phase 12 development diary

- Converted the hosted deployment direction into a reproducible standalone
  Next.js, n8n, and Caddy Compose package.
- Added nonce-based CSP, production HSTS, request-size limits, authenticated
  readiness, and session timeouts using the installed Next.js 16 guidance.
- Kept tutorial/practice records completely separate from operational tables and
  provider work.
- Added a Settings-launched workflow tutorial with real-interface spotlights,
  pause/resume/reset, human-control explanations, and a complete synthetic
  enquiry-to-follow-up scenario.
- Added launch acceptance and backup evidence registers with RLS, reviewed
  commands, audit events, and database tests.
- The first restore attempt exposed non-portable provider internals. The portable
  export was narrowed to application/Auth/Storage metadata plus explicit Storage
  objects, and the final disposable restore drill passed.
- Validated the local desktop direction but retained hosted deployment as the
  first supported production form because the client uses macOS and scheduled
  automation must run while staff computers are off.
