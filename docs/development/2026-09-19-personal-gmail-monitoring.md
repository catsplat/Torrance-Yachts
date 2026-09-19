# Personal Gmail monitoring

Replaced singleton mailbox selection with explicit per-user opt-in. The additive
migration preserves the former selected mailbox and all historical records.
Owners control monitoring through Account and alerts; administrators cannot use
the setting to opt another person's mailbox in. OAuth secrets remain in Vault.

The worker claims at most two mailboxes with SKIP LOCKED and a five-minute lease,
oldest claim first. One failing mailbox does not prevent another being processed.
Provider actions use the source message's owner, never the legacy selected user.

Focused verification: seven database assertions for ownership and RPC access,
one mocked two-owner failure/continuation test, and TypeScript. Deploy migration
20260919100000 together with the application update; no data reset is needed.
The five-minute lease currently also sets the minimum successful polling interval.
