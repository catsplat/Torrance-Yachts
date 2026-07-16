# Phase 6 booking and availability schema

| Record | Purpose | Mutation boundary |
| --- | --- | --- |
| `bookings` | Reviewed charter and commercial facts linked to an enquiry and sent offer | Confirmation, amendment, and lifecycle commands only |
| `booking_reservations` | Authoritative buffered yacht period | Booking commands only |
| `booking_status_history` | Append-only lifecycle reasons and actors | Database trigger only |
| `yachtfolio_booking_actions` | Manual external-system completion state | Yachtfolio command only |
| `yachtfolio_action_history` | Append-only complete/reopen evidence | Database command only |

Active reservations have a database exclusion constraint on overlapping yacht/date ranges. Partial unique indexes allow no more than one non-cancelled booking per enquiry or source offer. All tables use RLS, active-staff read policies, restricted grants, database-owned actor fields, and no application delete privilege.

Commands: `confirm_booking`, `amend_confirmed_booking`, `transition_booking_status`, `set_yachtfolio_action_status`, and read-only `check_yacht_availability`.
