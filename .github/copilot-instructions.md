# Torrance Yachts contributor instructions

Read `AGENTS.md` and `docs/PROJECT_BRIEF.md` before proposing architectural, workflow, database, security, or integration changes.

- Treat PostgreSQL as the operational source of truth.
- Keep consequential actions behind explicit human approval.
- AI may classify, extract, summarise, draft, and suggest; it may not autonomously book, send, disclose, invoice, or change material workflow state.
- Never add live client data, identity documents, credentials, bank details, private contacts, or current commercial terms to source control.
- Keep business rules outside presentation components and test them.
- Prefer small, dependency-aware vertical slices and avoid unnecessary dependencies.
- Record significant decisions, user-visible changes, verification evidence, and development milestones in the existing documentation structure.
- Consult the bundled Next.js documentation in `node_modules/next/dist/docs/` because this project uses a version with conventions that may differ from older examples.
