# Phase 8 development diary

The document slice separates three facts that are often incorrectly conflated:
the file exists, a human verified it, and its contents were approved as operational
data. Each transition is explicit and auditable.

Payment schedules are created only at approval time and must reconcile exactly to
the reviewed charter fee. The 2% commission uses deterministic database arithmetic,
not an AI response. Approved dates update the booking, buffered reservation, and
the existing task engine together.
