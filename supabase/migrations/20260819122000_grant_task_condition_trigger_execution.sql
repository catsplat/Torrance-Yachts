-- Booking/document triggers run in the staff transaction that changed the
-- record, so active staff need execution rights for the internal refresher.
grant execute on function public.refresh_task_readiness_for_booking(uuid) to authenticated;
