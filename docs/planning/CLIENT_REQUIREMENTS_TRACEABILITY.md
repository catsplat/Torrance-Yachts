# Client requirements traceability

This matrix translates the client's original wording into the PostgreSQL-centred
architecture. References to Google Sheets mean the authoritative application
database and optional later synchronised views. References to automatic
consequential actions remain subject to human approval.

## Email, enquiry, offer, and booking flow

| Client request | Implementation |
| --- | --- |
| Read and categorise emails into enquiries, internal mail, circulars, and unknowns | Phase 9 stores messages/threads and deterministically routes safe cases; Phase 10 adds evidence-backed AI suggestions; uncertain mail remains human-reviewed |
| Track enquiry data in a presentable Sheet/website | Phase 4 enquiry database and UI are authoritative; Phase 11 provides a controlled one-way workbook snapshot |
| Telegram notification for enquiries, internal mail, unknown mail, and non-circular mail | Phase 11 materialises central notifications and queues idempotent Telegram delivery through n8n |
| Ignore, mark read, and archive circulars | Phase 9 creates idempotent actions; Phase 11 queues them through the Gmail adapter |
| Distinguish new enquiries from follow-ups | Phase 9 links Gmail threads, automatically recognises known threads, and lets staff create/reuse sender contacts and enquiries |
| Draft the yacht-specific new-enquiry response | Phase 5/10 prepare the reviewed content; Phase 11 delivers to Telegram or creates a Gmail draft without automatic sending |
| Notify sender and summary for other relevant emails | Phase 9 stores and classifies them; Phase 10 supplies a reviewable summary; Phase 11 sends notifications |
| Enquiry becomes offer | Phase 5 controlled offer snapshots and status history |
| Fully signed contract becomes booking | Phase 6 human-confirmed booking command |
| Yacht unavailable for dates plus/minus 24 hours | Phase 6 exclusion-backed booking reservation |
| Booking starts the task sequence | Phase 7 transactional task generation |
| Website checklist, notes, task creation/removal, and dates | Phase 7 task register, dependencies, notes, scheduling, reopening, and audited ad-hoc tasks |
| Captain contact source per yacht | Phase 3 canonical contacts and yacht responsibilities; optional Phase 11 Sheet view |
| Remove irrelevant dead-end enquiries from normal pages | Phase 9 configurable inactivity settings archive rather than delete them |
| Help the client learn the complete service through the real workflow | Phase 12 Settings tutorial plus an isolated synthetic email-to-follow-up practice scenario after all operational interfaces are stable |

## Supplied booking sequence

| Ref | Required outcome | Delivery |
| --- | --- | --- |
| 0.0 | Start after human-approved signed contract | Phase 6 confirmation and Phase 7 generated milestone |
| 0.A | Request KYC statement/passport, draft and remind | Phase 7 task; wording becomes a versioned Phase 10/11 communication template; reminders in Phase 11 |
| 0.B | Record KYC, passport, and CDD check | Phase 7 dependency plus Phase 8 private document requirements |
| 1.A | Upload fully signed contract | Phase 7 task plus Phase 8 private versioned storage |
| 1.B | Extract/review contract facts | Phase 8 human-reviewed contract fields; Phase 10 adds evidence-backed extraction suggestions from selected clauses |
| 1.C | Calculate and prepare Kylian 2% invoice | Phase 8 deterministic calculation; versioned invoice/PDF delivery completes in Phase 11 without committing private bank details |
| 1.D | Upload Kylian invoice | Phase 7 task and Phase 8 financial-document requirement |
| 1.E | Update Booked status/dates in Yachtfolio | Phase 6 explicit Yachtfolio action and Phase 7 completion gate |
| 2.A | Draft captain contact details to broker | Phase 3 yacht contact data and Phase 7 task; Phase 10 versioned template and Phase 11 delivery |
| 2.B | Notify captain | Phase 7 dependency; Phase 11 central notification routing |
| 3 | First instalment reminder with operational context | Phase 8 schedule and Phase 7 due task; Phase 11 Telegram delivery |
| 4.A | Second instalment reminder | Phase 8 schedule and Phase 7 due task; Phase 11 delivery |
| 4.B | Optional third instalment reminder | Phase 8 supports one-to-three instalments; Phase 7 optional due task |
| 5 | Charter start notification/status | Phase 6 lifecycle, Phase 7 dated task, Phase 11 notification/calendar adapter |
| 6 | Charter end notification/status | Phase 6 lifecycle, Phase 7 dated task, Phase 11 notification/calendar adapter |
| 7 | Broker follow-up and commission invoice two days later | Phase 7 charter-end-offset task and Phase 8 broker invoice requirement; Phase 10/11 drafting and delivery |

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
