# Launch acceptance procedure

The application is code-complete only when automated checks pass. It is
production-approved only when `/settings/launch` shows every required item passed
with evidence and no required waiver.

The final client acceptance session must demonstrate with synthetic data:

1. email ingestion, classification, evidence, and human correction;
2. enquiry and yacht-specific offer preparation;
3. signed-contract and private-document review;
4. booking confirmation and buffered availability;
5. the exact dependent task sequence;
6. payment schedule, commission calculation, invoice PDF, and calendar;
7. Telegram/Gmail/Google delivery success and controlled failure/retry;
8. charter start, completion, Yachtfolio confirmation, and broker follow-up;
9. audit history and access separation;
10. backup artifact, isolated restore, and incident fallback;
11. tutorial completion and reset;
12. macOS browser use by the primary employee without developer intervention.

Record attendees, environment, release tag, date, evidence, defects, accepted
limitations, support owner, recurring costs, and go-live decision.

## Local offline prerequisite

Before any live activation, an administrator must complete the local rehearsal
from **Settings -> Offline workflow rehearsal**. Capture the following evidence:

1. the five fictional email routes and a replayed provider event;
2. a local Ollama proposal, human correction/rejection, and a recorded failed
   analysis case;
3. a fictional offer-to-booking sequence with the 24-hour availability buffer;
4. task dependencies 0.A-7, document requirements, contract review, payment
   schedule, invoice PDF, Yachtfolio task, charter start/end, and broker
   follow-up;
5. conflict, cancellation, amendment, missing-document, overdue-payment, and
   delivery-recovery paths; and
6. a disabled hosted scheduler plus one manual local development-simulator run.

No real documents, external credentials, or recipient contact is permitted in
this local prerequisite.
