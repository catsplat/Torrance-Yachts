# Phase 9 email-ingestion architecture

```text
Administrator-selected staff Google Workspace connection
  -> n8n scheduled POST /api/integrations/automation/tick
  -> Vault-held token refresh + Gmail history reconciliation
  -> shared validated ingestion command
  -> payload validation and service-role command
  -> unique Gmail message/thread/event records
  -> deterministic safe routing
       -> existing enquiry thread: follow-up
       -> mailing-list headers: circular
       -> configured domain: internal
       -> otherwise: human review
  -> durable workflow event / provider action outbox
```

The preferred adapter uses periodic `history.list` reconciliation and then fetches
each full message. The first run establishes a cursor without importing historical
mail. An expired cursor uses a bounded seven-day recovery. The existing raw n8n
Gmail endpoint remains as a compatibility/test boundary, but the preferred setup
does not require a second Gmail credential inside n8n.

- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/reference/rest

OAuth tokens are obtained with offline access and stored only in approved secret
storage. The OAuth callback must validate `state`:

- https://developers.google.com/identity/protocols/oauth2/web-server
