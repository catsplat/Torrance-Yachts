# ADR 0011: Provider-neutral, evidence-backed, human-reviewed AI

**Status:** Accepted

## Decision

AI is implemented behind a provider interface and may only create structured
suggestions. A deterministic local provider is the default development mode.
OpenAI is an optional server-side provider using the Responses API, Structured
Outputs, bounded requests, and disabled response storage.

Every suggestion must carry confidence and exact source evidence, remain editable,
and receive an explicit approve/reject decision with a reason. Approval never
executes an operational action; staff use the existing audited commands after
review.

Communication wording is versioned database content rather than hard-coded prompt
text. Consequential calculations remain deterministic application/database logic.

## Consequences

- The application remains useful and testable without a paid model.
- Provider replacement does not change the UI or business workflow.
- Prompt injection in email or contract text cannot grant operational authority.
- Corrections provide an audit trail and future evaluation data.
- Sensitive document types are excluded from automatic model processing.
- A server-only provider SDK is justified because it supplies the supported
  Responses and Structured Outputs integration without custom protocol code.
