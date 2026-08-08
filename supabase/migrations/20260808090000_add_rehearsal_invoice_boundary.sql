-- A fictional rehearsal must be able to exercise the deterministic invoice
-- artefact without approving, retiring, or reading a real invoice profile.
alter table public.invoice_profiles
  add column rehearsal_run_id uuid references public.rehearsal_runs (id) on delete restrict;

create index invoice_profiles_rehearsal_run_idx
  on public.invoice_profiles (rehearsal_run_id)
  where rehearsal_run_id is not null;

alter table public.rehearsal_run_records
  drop constraint rehearsal_run_records_entity_type_check;

alter table public.rehearsal_run_records
  add constraint rehearsal_run_records_entity_type_check check (
    entity_type in (
      'yacht', 'contact', 'email_thread', 'email_message', 'enquiry', 'offer',
      'booking', 'task', 'document', 'notification', 'contract_review',
      'payment', 'commission_calculation', 'generated_invoice',
      'invoice_profile', 'yachtfolio_action'
    )
  );

create or replace function public.configure_rehearsal_invoice_profile(
  p_rehearsal_run_id uuid
)
returns public.invoice_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.invoice_profiles;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rehearsal_runs
    where id = p_rehearsal_run_id and status = 'active'
  ) then
    raise exception 'Active rehearsal run not found' using errcode = 'P0002';
  end if;

  select * into profile
  from public.invoice_profiles
  where rehearsal_run_id = p_rehearsal_run_id
  order by created_at
  limit 1;
  if found then return profile; end if;

  perform set_config('app.phase11_command', 'yes', true);
  insert into public.invoice_profiles (
    version_number, status, profile_name, issuer_name, issuer_address,
    recipient_name, recipient_address, recipient_email,
    service_description_template, payment_instructions, rehearsal_run_id,
    created_by
  ) values (
    1, 'draft', 'Fictional rehearsal invoice profile ' || left(p_rehearsal_run_id::text, 8),
    'Torrance Yachts rehearsal', 'Fictional local address only',
    'Fictional recipient', 'Fictional local address only', 'fictional-recipient@example.test',
    'Fictional 2% charter commission for {{yacht_name}}',
    'No payment instruction: fictional local rehearsal only.', p_rehearsal_run_id,
    auth.uid()
  ) returning * into profile;
  perform set_config('app.phase11_command', '', true);
  return profile;
exception when others then
  perform set_config('app.phase11_command', '', true);
  raise;
end;
$$;

create or replace function public.register_rehearsal_generated_invoice(
  p_rehearsal_run_id uuid,
  p_booking_id uuid,
  p_commission_calculation_id uuid,
  p_document_id uuid,
  p_invoice_number text,
  p_issue_date date,
  p_service_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
  calculation public.commission_calculations;
  invoice_id uuid;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rehearsal_runs
    where id = p_rehearsal_run_id and status = 'active'
  ) or not exists (
    select 1 from public.rehearsal_run_records
    where rehearsal_run_id = p_rehearsal_run_id and entity_type = 'booking'
      and entity_id = p_booking_id
  ) then
    raise exception 'Active fictional booking rehearsal required' using errcode = '23514';
  end if;
  select id into profile_id
  from public.invoice_profiles
  where rehearsal_run_id = p_rehearsal_run_id and status = 'draft';
  if profile_id is null then
    raise exception 'Fictional rehearsal invoice profile not found' using errcode = 'P0002';
  end if;
  select * into calculation from public.commission_calculations
  where id = p_commission_calculation_id and booking_id = p_booking_id;
  if not found then
    raise exception 'Commission calculation not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.documents
    where id = p_document_id and booking_id = p_booking_id
      and document_type = 'kylian_commission_invoice'
      and verification_status = 'verified'
  ) then
    raise exception 'Verified fictional invoice document not found' using errcode = '23514';
  end if;
  if trim(p_invoice_number) !~ '^[A-Z0-9][A-Z0-9./_-]{2,79}$' then
    raise exception 'Invoice number format is invalid' using errcode = '22023';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  insert into public.generated_invoices (
    booking_id, commission_calculation_id, invoice_profile_id, document_id,
    invoice_number, issue_date, service_description, amount, currency, generated_by
  ) values (
    p_booking_id, p_commission_calculation_id, profile_id, p_document_id,
    upper(trim(p_invoice_number)), p_issue_date, trim(p_service_description),
    calculation.amount, calculation.currency, auth.uid()
  ) on conflict (booking_id, commission_calculation_id, invoice_profile_id)
  do nothing
  returning id into invoice_id;
  if invoice_id is null then
    select id into invoice_id
    from public.generated_invoices
    where booking_id = p_booking_id
      and commission_calculation_id = p_commission_calculation_id
      and invoice_profile_id = profile_id;
  end if;
  perform set_config('app.phase11_command', '', true);
  return invoice_id;
exception when others then
  perform set_config('app.phase11_command', '', true);
  raise;
end;
$$;

-- The trusted generated-document command is SECURITY DEFINER, so current_user
-- is its owner rather than the caller. Its authority must therefore come from
-- the signed Supabase request role, which is what the server-only client sets.
do $$
declare
  definition text;
  original_definition text;
begin
  select pg_get_functiondef(
    'public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text)'::regprocedure
  ) into definition;
  original_definition := definition;
  definition := replace(
    definition,
    'if current_user <> ''service_role'' then',
    'if coalesce(auth.role(), '''') <> ''service_role'' then'
  );
  if definition = original_definition then
    raise exception 'Expected trusted-document authority check was not found';
  end if;
  execute definition;
end;
$$;

-- Generated documents must retain the accountable staff member who requested
-- them. A service-role token has no user subject, so the server-only boundary
-- supplies an active profile ID explicitly. The older nine-argument function
-- is revoked below to prevent a future caller bypassing this audit field.
create function public.register_trusted_generated_document(
  p_booking_id uuid,
  p_document_type public.document_type,
  p_title text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_retention_class text,
  p_content_sha256 text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requirement_record public.booking_document_requirements;
  document_id uuid;
  next_version integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the trusted document generator may register generated files' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_created_by and active
  ) then
    raise exception 'Generated-document actor must be an active internal account' using errcode = '23514';
  end if;
  if p_storage_path !~ ('^' || p_booking_id::text || '/[0-9a-f-]{36}/[^/]+$')
    or p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid generated document metadata' using errcode = '22023';
  end if;
  select * into requirement_record from public.booking_document_requirements
  where booking_id = p_booking_id and document_type = p_document_type;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.documents where booking_id = p_booking_id and document_type = p_document_type;
  perform set_config('app.phase8_command', 'yes', true);
  insert into public.documents (
    booking_id, requirement_id, document_type, title, original_filename,
    storage_bucket, storage_path, mime_type, size_bytes, version_number,
    retention_class, content_sha256, scan_status, scanner_detail,
    scan_attempts, scan_started_at, scan_completed_at, released_at, created_by
  ) values (
    p_booking_id, requirement_record.id, p_document_type, trim(p_title),
    trim(p_original_filename), 'booking-private', p_storage_path, p_mime_type,
    p_size_bytes, next_version, p_retention_class, p_content_sha256,
    'released', 'Generated by the deterministic invoice service.', 0,
    now(), now(), now(), p_created_by
  ) returning id into document_id;
  if requirement_record.id is not null then
    update public.booking_document_requirements
    set status = 'uploaded', verified_document_id = null, updated_at = now()
    where id = requirement_record.id;
  end if;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (
    document_id, 'released',
    'Deterministic application-generated file released directly to protected storage',
    p_created_by
  );
  perform set_config('app.phase8_command', '', true);
  return document_id;
exception when others then
  perform set_config('app.phase8_command', '', true);
  raise;
end;
$$;

-- Extend the full reset handler without changing the released migration that
-- first introduced it. Derived invoices are removed before documents, then
-- only this run's fictional profile is removed.
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
    '  task_ids uuid[];' || chr(10) || '  counts jsonb;',
    '  task_ids uuid[];' || chr(10) || '  invoice_profile_ids uuid[];' || chr(10) || '  counts jsonb;'
  );
  definition := replace(
    definition,
    '  select coalesce(array_agg(entity_id), ''{}''::uuid[]) into task_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = ''task'';',
    '  select coalesce(array_agg(entity_id), ''{}''::uuid[]) into task_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = ''task'';' || chr(10) ||
    '  select coalesce(array_agg(entity_id), ''{}''::uuid[]) into invoice_profile_ids from public.rehearsal_run_records where rehearsal_run_id = p_rehearsal_run_id and entity_type = ''invoice_profile'';'
  );
  definition := replace(
    definition,
    '  delete from public.generated_invoices where booking_id = any(booking_ids);',
    '  perform set_config(''app.phase11_command'', ''yes'', true);' || chr(10) ||
    '  delete from public.generated_invoices where booking_id = any(booking_ids);'
  );
  definition := replace(
    definition,
    '  delete from public.yacht_sales_materials where yacht_id = any(yacht_ids);',
    '  delete from public.invoice_profiles where id = any(invoice_profile_ids);' || chr(10) ||
    '  perform set_config(''app.phase11_command'', '''', true);' || chr(10) || chr(10) ||
    '  delete from public.yacht_sales_materials where yacht_id = any(yacht_ids);'
  );
  if definition = original_definition then
    raise exception 'Expected full rehearsal reset handler statements were not found';
  end if;
  execute definition;
end;
$$;

revoke all on function public.configure_rehearsal_invoice_profile(uuid) from public, anon;
revoke all on function public.register_rehearsal_generated_invoice(uuid,uuid,uuid,uuid,text,date,text) from public, anon;
revoke all on function public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text) from public, anon, authenticated, service_role;
revoke all on function public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text,uuid) from public, anon, authenticated;
grant execute on function public.configure_rehearsal_invoice_profile(uuid) to authenticated;
grant execute on function public.register_rehearsal_generated_invoice(uuid,uuid,uuid,uuid,text,date,text) to authenticated;
grant execute on function public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text,uuid) to service_role;
