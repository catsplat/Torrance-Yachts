# Phase 9 email-ingestion architecture

```text
Gmail watch/history sync (Phase 11 n8n adapter)
  -> authenticated POST /api/integrations/gmail/messages
  -> payload validation and service-role command
  -> unique Gmail message/thread/event records
  -> deterministic safe routing
       -> existing enquiry thread: follow-up
       -> mailing-list headers: circular
       -> configured domain: internal
       -> otherwise: human review
  -> durable workflow event / provider action outbox
```

Google's Gmail API requires a mailbox `watch` renewal at least every seven days and
recommends daily renewal. Notifications contain a history ID rather than the full
message, so the adapter will use `history.list` and then fetch each message. Google
also recommends periodic history synchronisation because notifications can be
delayed or dropped:

- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/reference/rest

OAuth tokens are obtained with offline access and stored only in approved secret
storage. The OAuth callback must validate `state`:

- https://developers.google.com/identity/protocols/oauth2/web-server
