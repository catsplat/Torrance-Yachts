# 0053 — Manual setup links and private IMAP mailboxes

## Decision

Administrator-created invitations and password-recovery links use an
application-owned opaque URL. The Supabase verification hash remains encrypted
in Vault and is redeemed only after an explicit same-origin POST. Generic IMAP
is supported alongside Gmail using per-user provider app passwords stored in
Vault.

## Why

Forwarded raw Supabase verification URLs can be fetched by mail clients and
link-preview scanners. A GET request must therefore never consume a credential.
Many small operators also use a mail provider other than Google Workspace.

## Consequences

- A manual link is single-use, expires within 24 hours, and revokes older unused
  links of the same purpose for that account.
- Opening it is harmless; continuing from its page is the only redemption step.
- IMAP mail is encrypted at rest, private to the connected staff member, and
  enters the existing owner-aware ingestion pipeline.
- IMAP requires TLS and a provider-issued app password. Normal mailbox
  passwords, Microsoft OAuth, and automatic external sending are not accepted.
- Circular-message read/archive actions are carried out by the IMAP adapter
  using the same owner-bound connection; they cannot be routed through Gmail.
- Gmail remains the only adapter that creates Gmail drafts.
