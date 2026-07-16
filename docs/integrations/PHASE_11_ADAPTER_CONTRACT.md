# Phase 11 adapter contract

All endpoints require `Authorization: Bearer <AUTOMATION_SHARED_SECRET>`.

## Materialise

`POST /api/integrations/automation/tick`

Creates due notifications, Gmail provider actions, and internal calendar records.
It also processes at most one pending email AI summary per tick before
notifications are materialised. The operation is idempotent.

## Personal staff delivery

`POST /api/integrations/automation/dispatch-alerts`

Claims and delivers only:

- internal Telegram alerts through the server-side company bot;
- internal email alerts through the recipient staff member's encrypted Gmail
  OAuth credentials;
- approved Gmail drafts for external contacts.

The route never sends an external email. Gmail drafts still require a person to
review and send them from Gmail.

## Claim

`POST /api/integrations/deliveries/claim`

```json
{ "workerId": "n8n-production-1", "limit": 20 }
```

Returns leased delivery records. Drive deliveries include a leased private file
URL requiring the same bearer token.

## Complete

`POST /api/integrations/deliveries/{id}/complete`

```json
{
  "workerId": "n8n-production-1",
  "externalId": "provider-record-id",
  "externalUrl": "https://provider.example/record"
}
```

## Fail

`POST /api/integrations/deliveries/{id}/fail`

```json
{
  "workerId": "n8n-production-1",
  "errorCode": "provider_timeout",
  "errorMessage": "Bounded redacted provider error",
  "retryable": true
}
```

The database calculates retry timing. Workflows must never include secrets or
unredacted document/message contents in error text.
