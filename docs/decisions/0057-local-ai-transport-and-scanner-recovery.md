# Local helper authentication and scanner recovery

Helper requests have no browser cookie. Exempt only the shipped helper asset
and `/api/local-ai/` handlers from the browser-session redirect; retain the
handlers' pairing-code and agent-token checks and database owner validation.
Never exempt operational pages. Run one inference at a time, with a provider
deadline below the application's wait deadline, and retire abandoned jobs.

The hosted scanner suffered an observed cgroup OOM at 1 GiB. The existing
8 GiB host has capacity for a bounded 2 GiB scanner ceiling. Keep quarantine
fail-closed and Studio bound to a loopback-only published port. No data reset,
public admin endpoint, or additional paid resource is required.
