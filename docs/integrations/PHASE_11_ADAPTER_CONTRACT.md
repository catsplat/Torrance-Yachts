# Phase 11 adapter contract

All endpoints require `Authorization: Bearer <AUTOMATION_SHARED_SECRET>`.

## Materialise

`POST /api/integrations/automation/tick`

Creates due notifications, Gmail provider actions, and internal calendar records.
The operation is idempotent.

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
