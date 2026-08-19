# ADR 0055: Protected operational configuration pack

## Context

The charter workflow needs yacht-specific rates, offer wording, compliance
wording and reusable booking-workflow definitions. Those values are operational
data, not source code. They can contain commercial terms and private contact
information, so storing them in a repository or a deployment environment file
would be unsafe.

## Decision

Administrators import a versioned JSON configuration pack from the workspace.
The pack is validated in the application, previewed by PostgreSQL, then imported
in one transaction. The database retains the protected payload and a redacted
summary for audit; it creates only draft/versioned templates and additive yacht
configuration. Existing bookings, tasks, documents and audit history are never
removed by an import.

Only approved variables are accepted by the template composer. A template is
still reviewed and published through the existing template workflow before it
can be used operationally.

## Consequences

- Client-provided wording and commercial values are entered once at runtime and
  are not committed to Git.
- A malformed or incomplete pack fails as a whole instead of creating a partly
  configured operation.
- The importer currently covers yacht profiles, seasonal rates, sales links,
  communication templates and booking workflow drafts. Contacts, delivery
  destinations and invoice profiles remain managed through their dedicated,
  access-controlled settings screens until their import contracts are added.
