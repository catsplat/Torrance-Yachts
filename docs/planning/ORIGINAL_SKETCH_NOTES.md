# Original planning sketch: interpreted requirements

**Source file:** `Image 21-06-2026 at 10.53 (1).png`

**Source date shown in filename:** 21 June 2026

**Reviewed:** 15 July 2026

**SHA-256:** `5A4FB75DC029C2D47CF8463DF81B4DE2559E50C6F231F5608067B3A9806D1E27`

This record preserves the requirements interpreted from Thom's original hand-drawn plan. The sketch is design evidence, not a pixel-perfect UI specification. Where it conflicts with the approved project brief, security rules and the human-approval principle in `docs/PROJECT_BRIEF.md` take precedence.

The original image contains operational notes and is currently kept outside the repository. A reviewed, sanitised copy can be added later for portfolio use.

## Navigation and application structure

The sketch proposes a persistent application menu containing:

- Dashboard/home;
- Tasks;
- Enquiries;
- Yachts;
- Storage;
- Calendar.

The written project brief additionally requires Contacts/Customers, Bookings, Documents, and Settings. These should be represented without making the primary navigation overwhelming. Related secondary pages can sit within the main modules.

## Dashboard

The dashboard is drawn as an action surface rather than a reporting-only page. It includes:

- configurable or role-aware action shortcuts;
- a tasks panel;
- a compact list of items requiring attention today;
- an event/calendar panel grouped by yacht;
- direct navigation into the relevant record when a row/card is selected.

The initial implementation should use realistic placeholder records but label them clearly as demonstration data until the database is connected.

## Enquiries module

The sketch describes two related views.

### Enquiry workspace

- a highlighted `today's tasks`/next-actions area;
- client/contact details such as type, company, name, and contact information;
- status and progress indicators;
- search and filtering;
- linked emails and notes;
- an easy way to add an email/note to the enquiry record;
- access to important enquiry data without leaving the page.

### Enquiry record

- client and company name;
- charter/yacht dates;
- selected yacht and core charter details;
- status control;
- email thread/history;
- add enquiry and close/archive actions;
- stored references back to the originating communications.

The hand-drawn yacht tracking table suggests a comparison/availability view in which enquiries can be seen per yacht with concise state badges and direct record links.

## Tasks

The task screen includes:

- an add-task action;
- search/filter controls;
- reminder or notification controls;
- a concise list view rather than oversized cards;
- quick completion controls;
- filtering such as upcoming, assigned, or all;
- the ability to open a task for full details.

Task completion must respect dependencies and record who completed or reopened a task and when.

## Mobile notification/approval concept

The mobile sketch shows a compact notification containing:

- sender and subject/context;
- an AI-generated email summary;
- a suggested response;
- explicit accept/approve and reject/edit actions.

This reinforces the approved rule that AI prepares work but a user makes consequential decisions. Telegram is the first approved notification channel; the drawing's messaging references demonstrate the desired interaction pattern, not a commitment to WhatsApp in the initial release.

## Yachts and documents

Each yacht has a clear record with an edit action and grouped document access. The sketch suggests separate visual groupings for categories such as:

- booking/operational documents;
- signed charter documents;
- finished/completed charter documents;
- yacht sales/marketing documents.

The final taxonomy will use protected document metadata and permissions rather than relying solely on folder names.

## Storage

The storage screen is intended to feel familiar, similar to Google Drive:

- folders and nested organisation;
- add/upload and delete/archive actions;
- clear private/public distinction;
- selected folders or sensitive content locked from public access;
- central access to contracts and related documents.

The project brief's security rules override any implication that identity, KYC, contract, or invoice documents may use public links.

## Calendar

The calendar is intended to:

- show yacht booking dates clearly;
- distinguish yachts/bookings visually;
- support month/year navigation;
- open the booking record when a booking is selected;
- open task details when a task/deadline is selected;
- make relevant charter information accessible without duplicating the authoritative booking record.

## Email and enquiry workflow

The lower workflow drawing expresses this sequence:

1. Email is received.
2. Determine whether it is an enquiry.
3. Circular/newsletter messages are routed away from operational handling.
4. Internal or other relevant messages generate a summary notification.
5. An enquiry is processed into structured enquiry information.
6. The system distinguishes a new enquiry from a follow-up to an existing enquiry/thread.
7. The enquiry record is created or updated.
8. AI proposes extracted information, summary, response, and next actions.
9. A human reviews material changes before they affect state or external communications.

The written brief expands this with explicit unknown/low-confidence handling and idempotency requirements.

## Booked-state task logic

The drawing confirms that moving an enquiry/offer into `Booked` starts the booking task thread. It lists the same essential sequence captured in the project brief:

- upload the signed contract;
- send relevant booking/captain information;
- first instalment due;
- second instalment due;
- optional third instalment due;
- start of charter;
- end of charter;
- follow up with the broker.

The image also describes a cancellation branch. Cancelling a booked workflow should stop or supersede inappropriate future reminders, preserve the audit trail, require a cancellation reason, and create any necessary cancellation-specific follow-up rather than deleting the booking history.

## Notification context

Operational reminders should include enough context to act without searching, including relevant combinations of:

- yacht;
- charter dates;
- broker/contact;
- email/thread;
- task or payment due;
- amount/currency where permitted;
- direct link to the internal record.

Sensitive information must still be minimised for the chosen channel.

## Design decisions derived from the sketch

1. Prioritise fast scanning and action over dense analytics.
2. Keep primary modules reachable from persistent navigation.
3. Make status, due dates, and missing information visually obvious.
4. Use compact lists/tables for operational volume and cards for summaries.
5. Make every dashboard, calendar, and notification item link back to its authoritative record.
6. Treat mobile as a responsive/notification experience first, not a separate native application.
7. Preserve the sketch's clear colour-coding concept while using an accessible professional palette and never relying on colour alone.
