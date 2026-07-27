-- The booking-document requirement retains the verified document reference.
-- A rehearsal reset must detach that relationship before deleting fictional
-- documents; normal production document constraints remain unchanged.
do $$
declare
  definition text;
  original_definition text;
begin
  select pg_get_functiondef('public.reset_rehearsal_run(uuid,text)'::regprocedure)
  into definition;
  original_definition := definition;
  definition := replace(
    definition,
    '  delete from public.documents where booking_id = any(booking_ids);',
    '  update public.documents set requirement_id = null where booking_id = any(booking_ids);' || chr(10) ||
    '  update public.booking_document_requirements set verified_document_id = null where booking_id = any(booking_ids);' || chr(10) ||
    '  delete from public.booking_document_requirements where booking_id = any(booking_ids);' || chr(10) ||
    '  delete from public.documents where booking_id = any(booking_ids);'
  );
  if definition = original_definition then
    raise exception 'Expected rehearsal document reset statement was not found';
  end if;
  execute definition;
end;
$$;
