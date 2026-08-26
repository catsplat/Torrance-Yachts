# Client workflow refinements

This slice closes three practical workflow gaps identified during client
review.

- Bookings can now be entered without an enquiry when a signed charter already
  exists outside the enquiry workflow.
- Staff can place a clearly labelled availability hold without starting a
  booking checklist, and amend or cancel it with an audit reason.
- Communication templates no longer require a redundant subject when the
  message will be drafted inside an existing email thread.

The task engine was also checked against the supplied charter sequence. The
default template already contains the grouped 0.A–7 workflow, dependencies,
payment anchors, document gates, cancellation task and Yachtfolio completion
boundary. The UI continues to expose it as a booking checklist and provides a
short ad-hoc task form for ordinary work.

Contact pages now use the clearer term **Yacht assignment**. It records the
specific yacht a captain, manager, operations contact or notification
recipient is responsible for; it does not duplicate the person’s general role.
