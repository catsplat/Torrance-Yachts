# Gmail and Telegram provider-contract assurance

Before client-owned provider accounts are connected, the local test suite now
simulates the provider responses used by the production dispatch adapter.

It verifies that:

- a Telegram alert is addressed to the configured staff chat and contains the
  secure in-app review link;
- a broker-facing Gmail action uses the Gmail **drafts** endpoint, not the send
  endpoint, and preserves the reviewed recipient and body in its MIME payload;
- unavailable Gmail OAuth credentials are classified as an actionable,
  non-retryable configuration failure rather than an endlessly retried outage.

The test doubles replace only network responses. They exercise the same
application dispatch code and do not store an API token, create an email draft,
or contact Telegram.

## Remaining live acceptance

This is pre-acceptance, not live acceptance. The client must still supply a
company-owned Google OAuth application and Telegram bot, pair a staff chat, and
approve one synthetic message in each provider before either adapter is enabled
for operational use.
