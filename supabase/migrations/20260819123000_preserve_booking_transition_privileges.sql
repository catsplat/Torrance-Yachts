-- Replacing the lifecycle function must retain the original controlled-command
-- privilege boundary; it writes the append-only history itself.
alter function public.transition_booking_status(uuid,public.booking_status,text) security definer;
