# Protected operational setup extension

## What changed

The administrator Configuration Pack now supports the remaining structured
operational setup that belongs in the database rather than the repository:

- yachts and seasonal rates;
- contacts, optional company links and yacht assignments;
- notification eligibility for yacht contacts;
- draft offer and communication wording;
- draft invoice profile details; and
- a versioned draft booking workflow.

The pack is validated before it is previewed and imported. It is additive, so
existing operational records are never deleted. A blank communication subject
is intentional for replies in an existing thread.

## Verification

- Fresh local schema reset completed.
- 41 database test files / 1,024 assertions passed.
- The configuration-pack contract test covers a synthetic captain assignment,
  company relationship, draft invoice profile, and a blank-subject reply
  template.

## Remaining human setup

The actual yacht terms, contact details, invoice/payment data and approved
wording must be imported by an authorised administrator in the hosted app. They
are deliberately absent from this repository.
