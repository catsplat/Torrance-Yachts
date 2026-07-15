<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Torrance Yachts project rules

- Read `docs/PROJECT_BRIEF.md` before making architectural or workflow changes.
- Use `docs/planning/ORIGINAL_SKETCH_NOTES.md` as design evidence, not as permission to weaken security or human approval.
- Keep PostgreSQL as the operational source of truth; integrations are adapters, not authoritative stores.
- AI may suggest and extract but may not perform consequential business actions without human approval.
- Never commit credentials, live client data, identity documents, bank details, current private contact details, or production commercial terms.
- Use realistic synthetic fixtures for development and demonstrations.
- Keep business rules outside presentation components and add tests when business logic is introduced.
- Record meaningful decisions in `docs/decisions/`, user-visible changes in `CHANGELOG.md`, and implementation milestones in `docs/development/`.
- Do not add dependencies without a clear, documented benefit.
