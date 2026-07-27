-- A full fictional charter must exercise the same operational commands as live
-- work, while retaining a reliable, run-scoped cleanup boundary.
create or replace function public.configure_rehearsal_fixture_yacht(
  p_rehearsal_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_yacht_id uuid;
  rate_id uuid;
  template_id uuid;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  select entity_id into fixture_yacht_id
  from public.rehearsal_run_records
  where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'yacht'
  order by created_at
  limit 1;
  if fixture_yacht_id is null then
    fixture_yacht_id := public.create_rehearsal_fixture_yacht(p_rehearsal_run_id);
  end if;

  insert into public.yacht_commercial_profiles (
    yacht_id, overview, port_guidance, fuel_consumption_lph,
    fuel_consumption_speed_knots, short_charter_divisor, default_currency,
    default_tax_rate, key_features, reference_notes, created_by, updated_by
  ) values (
    fixture_yacht_id,
    'Fictional charter yacht used only for the isolated local rehearsal.',
    'Athens round trips are preferred for this fictional rehearsal.',
    210, 12, 6, 'EUR', 5,
    array['Fictional rehearsal interior', 'Synthetic captain and crew', 'Private local workflow only'],
    'No real yacht, guest, broker, rate, or reference is represented.',
    auth.uid(), auth.uid()
  ) on conflict (yacht_id) do nothing;

  insert into public.yacht_rate_periods (
    yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate,
    created_by, updated_by
  ) values (
    fixture_yacht_id, 'Fictional rehearsal rate', '2026-01-01', '2030-12-31',
    168000, 'EUR', 5, auth.uid(), auth.uid()
  ) on conflict do nothing
  returning id into rate_id;
  if rate_id is null then
    select id into rate_id from public.yacht_rate_periods
    where yacht_id = fixture_yacht_id and active
    order by created_at limit 1;
  end if;

  insert into public.yacht_offer_templates (
    yacht_id, name, subject_template, body_template, created_by, updated_by
  ) values (
    fixture_yacht_id,
    'Fictional charter rehearsal reply',
    '{{yacht_name}} charter proposal — {{charter_start_date}}',
    E'Dear {{customer_name}},\n\nThis is a clearly fictional local rehearsal proposal for {{yacht_name}}.\n\nDates: {{charter_start_date}} to {{charter_end_date}}\nGuests: {{guest_count}}\nFee: {{proposed_charter_fee}} {{currency}}\n\n{{port_guidance}}\n\n{{yacht_overview}}\n\nKind regards,\nTorrance Yachts rehearsal'
    , auth.uid(), auth.uid()
  ) on conflict (yacht_id, version_number) do nothing
  returning id into template_id;
  if template_id is null then
    select id into template_id from public.yacht_offer_templates
    where yacht_id = fixture_yacht_id and status = 'approved'
    order by version_number desc limit 1;
  else
    perform public.approve_yacht_offer_template(template_id);
  end if;

  return jsonb_build_object('yacht_id', fixture_yacht_id, 'rate_id', rate_id, 'template_id', template_id);
end;
$$;

-- Replaces the initial email-only reset handler. The deletion order follows the
-- protected foreign-key graph and is deliberately restricted to run-tagged
-- fictional records and their derived children.
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
  offer_ids uuid[];
  booking_ids uuid[];
  task_ids uuid[];
  counts jsonb;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception 'A reset reason is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.rehearsal_runs where id = p_rehearsal_run_id and status = 'active') then
    raise exception 'Active rehearsal run not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_object_agg(entity_type, record_count), '{}'::jsonb) into counts
  from (
    select entity_type, count(*)::integer as record_count
    from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id
    group by entity_type
  ) grouped;
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into message_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'email_message';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into thread_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'email_thread';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into enquiry_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'enquiry';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into contact_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'contact';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into yacht_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'yacht';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into offer_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'offer';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into booking_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'booking';
  select coalesce(array_agg(entity_id), '{}'::uuid[]) into task_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'task';

  perform set_config('app.phase8_command', 'yes', true);
  delete from public.document_history where document_id in (select id from public.documents where booking_id = any(booking_ids));
  delete from public.generated_invoices where booking_id = any(booking_ids);
  delete from public.payment_schedules where booking_id = any(booking_ids);
  delete from public.commission_calculations where booking_id = any(booking_ids);
  delete from public.contract_reviews where booking_id = any(booking_ids);
  delete from public.documents where booking_id = any(booking_ids);
  delete from public.booking_document_requirements where booking_id = any(booking_ids);
  perform set_config('app.phase8_command', '', true);

  delete from public.task_dependencies where task_id = any(task_ids) or depends_on_task_id = any(task_ids);
  delete from public.task_history where task_id = any(task_ids);
  delete from public.task_notes where task_id = any(task_ids);
  delete from public.tasks where id = any(task_ids);
  delete from public.yachtfolio_action_history where action_id in (select id from public.yachtfolio_booking_actions where booking_id = any(booking_ids));
  delete from public.yachtfolio_booking_actions where booking_id = any(booking_ids);
  delete from public.booking_reservations where booking_id = any(booking_ids);
  delete from public.booking_status_history where booking_id = any(booking_ids);
  delete from public.bookings where id = any(booking_ids);
  delete from public.offer_status_history where offer_id = any(offer_ids);
  delete from public.offers where id = any(offer_ids);

  delete from public.yacht_sales_materials where yacht_id = any(yacht_ids);
  delete from public.yacht_offer_templates where yacht_id = any(yacht_ids);
  delete from public.yacht_rate_periods where yacht_id = any(yacht_ids);
  delete from public.yacht_commercial_profiles where yacht_id = any(yacht_ids);

  perform set_config('app.phase10_command', 'yes', true);
  delete from public.ai_suggestion_evidence where suggestion_id in (select id from public.ai_suggestions where source_type = 'email_message' and source_id = any(message_ids));
  delete from public.ai_suggestion_revisions where suggestion_id in (select id from public.ai_suggestions where source_type = 'email_message' and source_id = any(message_ids));
  delete from public.ai_suggestions where source_type = 'email_message' and source_id = any(message_ids);
  delete from public.ai_runs where source_type = 'email_message' and source_id = any(message_ids);
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
  delete from public.workflow_events where aggregate_id = any(message_ids) or aggregate_id = any(enquiry_ids) or aggregate_id = any(offer_ids) or aggregate_id = any(booking_ids) or aggregate_id = any(task_ids);
  delete from public.enquiries where id = any(enquiry_ids);
  delete from public.contacts where id = any(contact_ids);
  delete from public.yachts where id = any(yacht_ids);

  delete from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id;
  update public.rehearsal_runs set status = 'reset', reset_by = auth.uid(), reset_at = now(), reset_reason = trim(p_reason), record_counts = counts where id = p_rehearsal_run_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, old_values, new_values, source)
  values (auth.uid(), 'update', 'rehearsal_run', p_rehearsal_run_id, jsonb_build_object('status', 'active'), jsonb_build_object('status', 'reset', 'record_counts', counts), 'offline_rehearsal');
  return counts;
exception when others then
  perform set_config('app.phase8_command', '', true);
  perform set_config('app.phase9_command', '', true);
  perform set_config('app.phase10_command', '', true);
  raise;
end;
$$;

revoke all on function public.configure_rehearsal_fixture_yacht(uuid) from public, anon;
grant execute on function public.configure_rehearsal_fixture_yacht(uuid) to authenticated;
