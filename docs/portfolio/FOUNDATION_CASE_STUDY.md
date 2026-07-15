# Portfolio case study: foundation

## Problem

Torrance Yachts' charter booking process is currently managed manually from the first enquiry through contracting, compliance documents, payments, captain communication, charter dates, and follow-up. The project aims to reduce missed work and duplicated data while preserving human control over consequential actions.

## Constraints

- One primary user and no need for large-scale architecture.
- A first-time large web-project developer working with AI assistance.
- Sensitive identity, contractual, financial, and contact information.
- A broad workflow that could easily become a fragile collection of automations.
- A low recurring-cost target.

## Foundation approach

- Converted informal notes and a hand-drawn sketch into a sanitised, auditable product brief.
- Chose a server-first Next.js/TypeScript architecture with application-owned shadcn/ui components.
- Created a professional responsive operations dashboard based on the sketch's action-focused design.
- Used only labelled synthetic data and connected no external services.
- Established a changelog, architectural decision record, development diary, security policy, and verification record from the first code milestone.
- Remediated a transitive dependency advisory without accepting an unsafe automated framework downgrade.

## Demonstrated engineering decisions

- PostgreSQL will be the future operational source of truth; Sheets and integrations remain adapters.
- AI is constrained to extraction, summarisation, drafting, and suggestion until a human approves the action.
- Client-side JavaScript is limited to interactions that need it.
- Production-looking UI is not treated as production readiness; documentation names the missing security gates explicitly.

## Result

Version `0.1.0` is a working, production-compilable foundation with responsive navigation, a realistic dashboard, module route boundaries, an owned design system, and complete milestone evidence. It gives future vertical slices somewhere stable to land without creating paid services or risking live data.

## Privacy note

Portfolio screenshots and narrative must remain synthetic or explicitly sanitised. The private business workflow, current contact details, bank information, live rates, client communications, and documents are excluded from this case study.
