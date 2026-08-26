# ADR 0058: Extend the protected configuration pack for operational setup

## Status

Accepted — 26 August 2026.

## Context

The application already imported yachts, rates, offer material, communication
templates and draft task workflows through an administrator-only Configuration
Pack. Completing the operating setup also requires captain assignments and a
versioned invoice profile. Those values are commercial or personal operational
data and must not be placed in source control.

## Decision

Keep the Configuration Pack as an administrator-only, runtime database import
and extend it with:

- contacts and optional company links;
- captain/manager/operations/notification yacht assignments;
- a draft invoice profile; and
- communication templates with an optional subject. An empty subject means the
  template is intended as a reply in an existing email thread.

The original importer remains intact for backward compatibility. The extended
importer first runs the original atomic import, then adds the new records in the
same transaction. Any invalid contact, unknown yacht assignment, or invoice
failure rolls the complete operation back.

## Consequences

- Client values are entered once into protected operational storage and are not
  committed to Git, screenshots, or fixtures.
- Imported templates and invoice profiles remain drafts for an administrator to
  review and approve before use.
- Staff-level Telegram pairing remains personal; a Configuration Pack may mark
  a yacht assignment notification-eligible but never stores a bot token or a
  staff chat identity.
