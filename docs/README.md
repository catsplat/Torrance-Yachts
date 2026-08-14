# Documentation index

This directory contains the maintained technical, operational and audit record
for the Torrance Yachts Charter Operations Platform. Start with the documents
below rather than relying on historical phase notes.

| Need | Document |
| --- | --- |
| Understand product scope and non-negotiable controls | [Project brief](PROJECT_BRIEF.md) |
| Understand what is complete and what remains before launch | [Completion register](planning/PROJECT_COMPLETION_REGISTER.md) and [launch-gap register](planning/LAUNCH_GAP_REGISTER.md) |
| Provision or operate the hosted service | [Deployment architecture](deployment.md), [production runbook](operations/PRODUCTION_DEPLOYMENT.md) and [activation handoff](operations/HOSTED_ACTIVATION_HANDOFF.md) |
| Run the product day to day | [Staff guide](user-guide.md) and [operations guide](operations.md) |
| Review security and data-handling boundaries | [Security policy](../SECURITY.md) and [user-state isolation](security/USER_STATE_ISOLATION.md) |
| Review implementation design | [Architecture records](architecture), [database records](database) and [decisions](decisions) |
| Review test evidence and change history | [Audit records](audit), [development diary](development) and [changelog](../CHANGELOG.md) |

## Documentation conventions

- **Living documents** describe the current release and are updated when the
  product, architecture or operating process changes.
- **Decision records** explain durable technical choices and their trade-offs.
- **Development and audit records** are historical evidence. They are not
  rewritten merely because the platform later evolves.
- All examples must use fictional or sanitised information. Credentials, client
  data, private contacts, identity documents, contracts and current commercial
  terms do not belong in this repository.
