# Service recovery and local AI transport

- Confirmed clamd had suffered a cgroup OOM kill at 1 GiB while freshclam stayed running. Raised the scanner ceiling to 2 GiB on the existing 8 GiB VPS; no data volumes replaced.
- Set Studio's bind hostname explicitly; its loopback-only published port and SSH access boundary are unchanged.
- Both services recovered to healthy; Studio's profile endpoint returned HTTP 200.
- Fixed helper transport being redirected to browser login. Pairing codes and agent-token RPCs remain the authentication boundary for helper endpoints.
- Scoped helper credentials to workspace origin, honoured explicit re-pairing, serialised inference, bounded requests, probed model availability and corrected launchctl replacement.
- Expire outstanding local analysis when the waiting application request ends. Native macOS execution remains unverified on this Windows host.

Remaining audit work: multi-mailbox Gmail configuration, Telegram transport for private hosting, workflow/template completeness, backups and deployed application alignment. This milestone does not declare those items complete.
