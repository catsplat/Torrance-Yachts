# Phase 9 database schema

Phase 9 adds:

- `operational_settings`
- `email_threads`
- `email_messages`
- `email_attachments`
- `email_ingestion_events`
- `email_classification_history`
- `email_provider_actions`

Provider event IDs and Gmail message IDs are independently unique. This records
delivery attempts while preventing duplicate messages. Threads may link to one
authoritative enquiry, and later messages in a linked thread become follow-ups.

Active staff have read access through RLS. Staff mutations use controlled commands.
The service role has the minimum reads and one ingestion command required by the
trusted adapter. Anonymous access is denied.

Timeout settings cover `new`, `waiting_for_reply`, `offer_sent`, and `negotiating`
states independently. The sweep archives qualifying enquiries through the existing
state machine, preserving history and workflow events.
