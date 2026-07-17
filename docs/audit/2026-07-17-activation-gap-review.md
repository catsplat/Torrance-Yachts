# Activation gap review

**Date:** 17 July 2026  
**Scope:** interrupted Phase 12 handover claims versus repository evidence

## Findings

| Handover concern | Repository evidence | Resolution |
| --- | --- | --- |
| Dashboard is hardcoded demo data | Dashboard queries authorised PostgreSQL records and bounded counts; no `demo-data.ts` exists | No replacement required |
| Tutorial is missing or unsafe | Settings already launches an isolated, resettable synthetic enquiry-to-follow-up flow with permanent training history | Retained and documented |
| Yachtfolio has no status/history | Booking records already expose pending/completed/reopened Yachtfolio actions, reasons, evidence, history, and workflow events | Retained as manual by design |
| Launch readiness is missing | `/settings/launch`, health endpoints, runbooks, backup evidence, and production Compose already exist | Extended with provider activation status |
| Fresh installation needs direct Auth/SQL work | No one-time first-administrator workflow existed | Added token-protected `/setup` bootstrap |
| External credentials can be auto-generated | Google consent, Telegram bot ownership, SMTP, and production secrets require client/operator control | Added explicit activation runbook; no unsafe automation |
| Credential presence proves readiness | A configured but inactive/broken provider may still fail | Added health, enablement, destination, and recent-ingestion indicators |

## Security conclusion

The new setup and readiness work does not introduce public registration, expose
secret values, put external providers in control of operational state, or permit
AI to execute consequential actions. Live data remains blocked until launch
evidence and client sign-off are complete.

## Verification

- 79 application tests passed across 19 files;
- 608 PostgreSQL permission and behaviour assertions passed across 13 files;
- database lint reported no warnings;
- production build completed with 44 generated routes, including dynamic
  `/setup` and `/settings/activation` routes;
- authenticated local walkthrough showed no browser warnings or errors;
- production Compose validated with synthetic environment values;
- dependency audit reported zero known vulnerabilities.
