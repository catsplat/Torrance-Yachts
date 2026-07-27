# Client requirements traceability

This matrix translates the client's original wording into the PostgreSQL-centred
architecture. References to Google Sheets mean the authoritative application
database and optional later synchronised views. References to automatic
consequential actions remain subject to human approval.

## Email, enquiry, offer, and booking flow

| Client request | Implementation |
| --- | --- |
| Read and categorise emails into enquiries, internal mail, circulars, and unknowns | Phase 9 stores messages/threads and deterministically routes safe cases; Phase 10 adds evidence-backed AI suggestions; the credential-free Phase 11 n8n Gmail Trigger bridge now posts real provider events through the same validated/idempotent boundary; uncertain mail remains human-reviewed |
| Track enquiry data in a presentable Sheet/website | Phase 4 enquiry database and UI are authoritative; Phase 11 provides a controlled one-way workbook snapshot |
| Telegram notification for enquiries, internal mail, unknown mail, and non-circular mail | Phase 11/`v0.13` materialises per-user notifications with optional AI summary/draft content and queues idempotent Telegram delivery through the local n8n scheduler |
| Ignore, mark read, and archive circulars | Phase 9 creates idempotent actions; dedicated inactive Phase 11 n8n workers claim only `gmail_mark_read` or `gmail_archive`, retry provider failures and report outcomes |
| Distinguish new enquiries from follow-ups | Phase 9 links Gmail threads, automatically recognises known threads, and lets staff create/reuse sender contacts and enquiries |
| Draft the yacht-specific new-enquiry response | Phase 5/10 prepare the reviewed content; `v0.13` automatically analyses one pending email per tick and includes the clearly labelled draft in the staff alert without sending it |
| Notify sender and summary for other relevant emails | Phase 9 stores and classifies them; Phase 10 supplies a reviewable summary; Phase 11 sends notifications |
| Enquiry becomes offer | Phase 5 controlled offer snapshots and status history |
| Fully signed contract becomes booking | Phase 6 human-confirmed booking command |
| Yacht unavailable for dates plus/minus 24 hours | Phase 6 exclusion-backed booking reservation |
| Booking starts the task sequence | Phase 7 transactional task generation |
| Website checklist, notes, task creation/removal, and dates | Phase 7 task register, dependencies, notes, scheduling, reopening, and audited ad-hoc tasks |
| Captain contact source per yacht | Phase 3 canonical contacts and yacht responsibilities; optional Phase 11 Sheet view |
| Remove irrelevant dead-end enquiries from normal pages | Phase 9 configurable inactivity settings archive rather than delete them |
| Help the client learn the complete service through the real workflow | Phase 12 Settings tutorial plus an isolated synthetic email-to-follow-up practice scenario after all operational interfaces are stable |
| Keep the internal service private and resistant to attack | Individual accounts, server-verified sessions, RLS, private signed document access, audit history, nonce CSP, HSTS, least-privilege adapters, and an evidence-based Phase 12 production gate |
| Retain phone/notification ownership per yacht | Phase 3 yacht responsibilities and notification phone; Phase 11 central recipient/channel routing |
| Let each staff member receive their own alerts | `v0.13` self-service alert email, phone, Telegram chat ID, channel/topic preferences, AI-summary preference, and encrypted Gmail OAuth connection |
| Operate n8n without a paid n8n Cloud subscription | Pinned self-hosted n8n Community Edition in both local development and the Phase 12 Linux deployment package |
| Provide hosted and future downloadable/local forms | Phase 12 makes the hosted Linux/Supabase form the supported first release and preserves the cross-platform local package as a separate documented delivery |
| Avoid missed operations and prove recoverability | Phase 11 observable retries plus Phase 12 readiness monitoring, encrypted exports, restore evidence, incident response, maintenance, and launch acceptance |

## Supplied booking sequence

| Ref | Required outcome | Delivery |
| --- | --- | --- |
| 0.0 | Start after human-approved signed contract | Phase 6 confirmation and Phase 7 generated milestone |
| 0.A | Request KYC statement/passport, draft and remind | Numbered task, approved versioned template, task-page Telegram draft preparation, and due/escalation reminders |
| 0.B | Record KYC, passport, and CDD check | Phase 7 dependency plus Phase 8 private document requirements |
| 1.A | Upload fully signed contract | Phase 7 task plus Phase 8 private versioned storage |
| 1.B | Extract/review contract facts | Phase 8 human-reviewed contract fields; Phase 10 adds evidence-backed extraction suggestions from selected clauses |
| 1.C | Calculate and prepare Kylian 2% invoice | Phase 8 deterministic calculation; versioned invoice/PDF delivery completes in Phase 11 without committing private bank details |
| 1.D | Upload Kylian invoice | Phase 7 task and Phase 8 financial-document requirement |
| 1.E | Update Booked status/dates in Yachtfolio | Phase 6 explicit Yachtfolio action and Phase 7 completion gate |
| 2.A | Draft captain contact details to broker | Task-page draft resolves the yacht's reviewed primary captain and approved versioned template, then enters Telegram approval |
| 2.B | Notify captain | Task-page action prepares a Gmail draft to the primary captain; approval creates the draft but never sends it |
| 3 | First instalment reminder with operational context | Phase 8 schedule and Phase 7 due task; Phase 11 Telegram delivery |
| 4.A | Second instalment reminder | Phase 8 schedule and Phase 7 due task; Phase 11 delivery |
| 4.B | Optional third instalment reminder | Phase 8 supports one-to-three instalments; Phase 7 optional due task |
| 5 | Charter start notification/status | Phase 6 lifecycle, Phase 7 dated task, Phase 11 notification/calendar adapter |
| 6 | Charter end notification/status | Phase 6 lifecycle, Phase 7 dated task, Phase 11 notification/calendar adapter |
| 7 | Broker follow-up and commission invoice two days later | Charter-end-plus-two-days task, broker invoice requirement, and approved task-page follow-up draft preparation |

## Required document checklist

Phase 8 automatically creates private requirements for:

- signed charter agreement;
- broker KYC statement;
- client passport;
- CDD/passport check;
- Kylian commission invoice;
- optional broker commission invoice.

The supplied KYC wording is retained as a business requirement but will be stored as
editable versioned data, not hard-coded source text. Production recipients, bank
details, current rates, and real identity information remain outside Git.
