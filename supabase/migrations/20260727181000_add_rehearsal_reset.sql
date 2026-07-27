-- Reset is intentionally restrictive. If a run grows beyond the currently
-- supported fictional entities, it fails atomically rather than guessing which
-- operational records are safe to delete.
create or replace function public.reset_rehearsal_run(
  p_rehearsal_run_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_ids uuid[];
  thread_ids uuid[];
  enquiry_ids uuid[];
  contact_ids uuid[];
  yacht_ids uuid[];
  counts jsonb;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception 'A reset reason is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.rehearsal_runs
    where id = p_rehearsal_run_id and status = 'active'
  ) then
    raise exception 'Active rehearsal run not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.rehearsal_run_records
    where rehearsal_run_id = p_rehearsal_run_id
      and entity_type not in ('yacht', 'contact', 'email_thread', 'email_message', 'enquiry')
  ) then
    raise exception 'This run contains workflow records that need the full reset handler'
      using errcode = '23514';
  end if;

  select coalesce(jsonb_object_agg(entity_type, record_count), '{}'::jsonb)
  into counts
  from (
    select entity_type, count(*)::integer as record_count
    from public.rehearsal_run_records
    where rehearsal_run_id = p_rehearsal_run_id
    group by entity_type
  ) grouped;
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into message_ids
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'email_message';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into thread_ids
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'email_thread';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into enquiry_ids
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'enquiry';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into contact_ids
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'contact';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into yacht_ids
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'yacht';

  if exists (select 1 from public.offers where enquiry_id = any(enquiry_ids))
    or exists (select 1 from public.bookings where enquiry_id = any(enquiry_ids))
  then
    raise exception 'The rehearsal must be reset with the full booking-workflow handler'
      using errcode = '23514';
  end if;

  perform set_config('app.phase10_command', 'yes', true);
  delete from public.ai_suggestion_evidence
  where suggestion_id in (
    select id from public.ai_suggestions
    where source_type = 'email_message' and source_id = any(message_ids)
  );
  delete from public.ai_suggestion_revisions
  where suggestion_id in (
    select id from public.ai_suggestions
    where source_type = 'email_message' and source_id = any(message_ids)
  );
  delete from public.ai_suggestions
  where source_type = 'email_message' and source_id = any(message_ids);
  delete from public.ai_runs
  where source_type = 'email_message' and source_id = any(message_ids);
  perform set_config('app.phase10_command', '', true);

  perform set_config('app.phase9_command', 'yes', true);
  delete from public.email_provider_actions where message_id = any(message_ids);
  delete from public.email_attachments where message_id = any(message_ids);
  delete from public.email_classification_history where message_id = any(message_ids);
  delete from public.email_ingestion_events where message_id = any(message_ids);
  delete from public.email_messages where id = any(message_ids);
  delete from public.email_threads where id = any(thread_ids);
  perform set_config('app.phase9_command', '', true);

  delete from public.enquiry_notes where enquiry_id = any(enquiry_ids);
  delete from public.enquiry_status_history where enquiry_id = any(enquiry_ids);
  delete from public.workflow_events
  where (aggregate_type = 'email_message' and aggregate_id = any(message_ids))
    or (aggregate_type = 'enquiry' and aggregate_id = any(enquiry_ids));
  delete from public.enquiries where id = any(enquiry_ids);
  delete from public.contacts where id = any(contact_ids);
  delete from public.yachts where id = any(yacht_ids);

  delete from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id;
  update public.rehearsal_runs
  set status = 'reset',
      reset_by = auth.uid(),
      reset_at = now(),
      reset_reason = trim(p_reason),
      record_counts = counts
  where id = p_rehearsal_run_id;
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, old_values, new_values, source
  ) values (
    auth.uid(), 'update', 'rehearsal_run', p_rehearsal_run_id,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', 'reset', 'record_counts', counts),
    'offline_rehearsal'
  );
  return counts;
exception when others then
  perform set_config('app.phase9_command', '', true);
  perform set_config('app.phase10_command', '', true);
  raise;
end;
$$;

revoke all on function public.reset_rehearsal_run(uuid,text) from public, anon;
grant execute on function public.reset_rehearsal_run(uuid,text) to authenticated;
