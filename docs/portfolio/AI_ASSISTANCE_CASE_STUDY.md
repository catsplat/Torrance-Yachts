# Portfolio case study: AI assistance without surrendering control

Phase 10 demonstrates a production-oriented AI boundary rather than a chatbot
bolted onto a database.

The system supports interchangeable local and OpenAI providers, structured schema
validation, exact evidence verification, confidence, prompt/model provenance,
idempotent runs, corrections, explicit review, and permanent audit history.

The workflow is intentionally two-stage: a user approves the quality of a
suggestion, then separately applies reviewed facts through the pre-existing
business command. This prevents model output from sending communications,
classifying mail, creating bookings, changing availability, or altering financial
records.

The result is a useful assistant for email triage, enquiry extraction, drafting,
and contract-clause review while PostgreSQL and human decisions remain
authoritative.
