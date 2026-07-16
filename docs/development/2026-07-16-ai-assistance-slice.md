# Phase 10 development diary

The AI slice was added only after deterministic email intake, enquiry creation,
contract review, and payments already worked without a model. This kept the model
outside the source-of-truth path.

The central implementation decision was to separate four actions that are often
incorrectly collapsed into one: generate, correct, approve, and apply. A reviewer
can approve the quality of a suggestion without accidentally changing a booking
or sending a message.

A deterministic local provider was built alongside the OpenAI adapter. It makes
development repeatable and free, proves the provider boundary, and avoids making
the application unavailable when an external model is not configured.

Exact evidence matching exposed another useful constraint: model output is not
accepted merely because it conforms to JSON. Cited excerpts must also be present in
the supplied source.

The requested guided tutorial was recorded for Phase 12 rather than implemented
against unstable screens. It will use isolated synthetic records and disabled live
adapters.
