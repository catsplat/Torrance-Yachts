# Google Workspace provider adapters

Implemented the next staged-provider milestone after Gmail reconciliation.

## Delivered

- administrator selection of a connected staff Google account;
- service-only Vault credential access;
- stable private Google Calendar event create/update/cancellation;
- replay-safe Google Drive upload after clean-document enforcement;
- controlled Enquiries, Bookings and Captains Sheet replacement;
- immutable internal row identifiers and formula-safe raw values;
- bounded three-way dispatch with verified completion/failure recording;
- n8n scheduler call without provider credentials;
- name-based Drive folder selection and Google consent refresh.

## Acceptance boundary

Provider behaviour is exercised with local fake responses. Shared dispatch is
off by default, and no live Calendar event, Drive file or Sheet content is
created during development acceptance.
