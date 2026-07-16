# Phase 10 AI assistance architecture

Phase 10 adds a reviewable assistant to the established email, enquiry, booking,
document, and payment workflows. It does not add an autonomous decision-maker.

## Processing boundary

```text
Authorised staff request
  -> bounded source/context assembly
  -> selected provider
  -> schema validation
  -> exact-source evidence verification
  -> immutable run and editable suggestion
  -> human correction and approval/rejection
  -> separate existing business command
```

The provider interface supports:

- `local`: deterministic, no-cost development analysis;
- `openai`: server-side Responses API integration using Structured Outputs.

Provider choice and model are environment configuration. UI and business commands
do not depend on either provider.

## Safety and authority

- Email and pasted contract clauses are explicitly treated as untrusted input.
- Inputs and outputs are bounded and validated with Zod.
- Evidence must be an exact excerpt of the supplied source before it is stored.
- OpenAI requests use `store: false` and a hashed internal safety identifier.
- An AI approval approves only the suggestion; it does not classify an email,
  create an enquiry, approve contract fields, send a draft, create a booking, or
  alter a payment.
- Staff apply reviewed values through the existing transactional commands.
- Contract extraction requires an already verified charter-agreement record and
  deliberately pasted relevant clauses. Identity documents are not model input.

## Review surfaces

- Email detail: generate, inspect evidence, correct, approve/reject, then apply a
  separate human classification.
- Booking documents: paste selected contract clauses, inspect/correct extraction,
  approve/reject, then apply the reviewed contract form separately.
- AI Review: cross-workflow queue for pending and completed runs.
- Communication Templates: versioned drafts for KYC requests, captain-contact
  drafts, and broker follow-up wording with administrator approval.

## Audit and failure handling

Every request records provider, model, prompt version, source type, source ID,
input hash, status, timestamps, token usage when available, and a provider request
ID. Suggestions retain corrections, review decisions, reasons, reviewers, and
verified evidence. Failed runs retain a bounded redacted error record and do not
alter operational data.
