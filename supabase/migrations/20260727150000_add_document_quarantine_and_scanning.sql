-- Launch hardening: untrusted files are quarantined before they become available
-- to staff workflows or external mirrors. PostgreSQL remains the authoritative
-- record of both document state and scanner evidence.

create type public.document_scan_status as enum (
  'pending',
  'scanning',
  'clean',
  'infected',
  'error',
  'released'
);

alter table public.documents
  add column scan_status public.document_scan_status not null default 'pending',
  add column content_sha256 text,
  add column scanner_detail text,
  add column scan_attempts integer not null default 0 check (scan_attempts between 0 and 25),
  add column scan_started_at timestamptz,
  add column scan_completed_at timestamptz,
  add column released_at timestamptz,
  add column retention_review_due_at date;

alter table public.documents
  add constraint documents_content_sha256_format check (
    content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'
  );

create index documents_scan_status_created_idx
  on public.documents (scan_status, created_at desc);
create index documents_retention_review_idx
  on public.documents (retention_review_due_at)
  where retention_review_due_at is not null;

alter table public.document_history
  drop constraint document_history_action_check;
alter table public.document_history
  add constraint document_history_action_check check (
    action in (
      'uploaded', 'quarantined', 'scan_started', 'scan_clean', 'scan_infected',
      'scan_error', 'released', 'verified', 'rejected', 'retention_flagged'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-quarantine', 'booking-quarantine', false, 20971520,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "active staff upload quarantined booking files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'booking-quarantine'
  and (select public.is_active_staff())
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
);

create policy "active staff remove own quarantined booking files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'booking-quarantine'
  and (select public.is_active_staff())
  and owner_id = (select auth.uid()::text)
);

create or replace function public.register_quarantined_booking_document(
  p_booking_id uuid,
  p_document_type public.document_type,
  p_title text,
  p_original_filename text,
  p_quarantine_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_retention_class text,
  p_content_sha256 text
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
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.bookings where id = p_booking_id) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if p_quarantine_path !~ ('^' || p_booking_id::text || '/[0-9a-f-]{36}/[^/]+$') then
    raise exception 'Invalid quarantined document path' using errcode = '22023';
  end if;
  if p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'A SHA-256 file checksum is required' using errcode = '22023';
  end if;

  select * into requirement_record
  from public.booking_document_requirements
  where booking_id = p_booking_id and document_type = p_document_type;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.documents
  where booking_id = p_booking_id and document_type = p_document_type;

  perform set_config('app.phase8_command', 'yes', true);
  insert into public.documents (
    booking_id, requirement_id, document_type, title, original_filename,
    storage_bucket, storage_path, mime_type, size_bytes, version_number,
    retention_class, content_sha256, created_by
  ) values (
    p_booking_id, requirement_record.id, p_document_type, trim(p_title),
    trim(p_original_filename), 'booking-quarantine', p_quarantine_path,
    p_mime_type, p_size_bytes, next_version, p_retention_class,
    p_content_sha256, (select auth.uid())
  ) returning id into document_id;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (document_id, 'quarantined', 'Private file uploaded to quarantine before scanning', (select auth.uid()));
  perform set_config('app.phase8_command', '', true);
  return document_id;
end;
$$;

create or replace function public.record_document_scan_result(
  p_document_id uuid,
  p_status public.document_scan_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  history_action text;
begin
  if not (public.is_administrator() or current_user = 'service_role') then
    raise exception 'Administrator or scanner service access is required' using errcode = '42501';
  end if;
  if p_status not in ('scanning', 'clean', 'infected', 'error') then
    raise exception 'Invalid scanner state' using errcode = '22023';
  end if;
  if char_length(trim(p_reason)) < 2 or char_length(trim(p_reason)) > 2000 then
    raise exception 'Scanner evidence is required' using errcode = '22023';
  end if;

  perform set_config('app.phase8_command', 'yes', true);
  update public.documents
  set scan_status = p_status,
      scanner_detail = trim(p_reason),
      scan_attempts = case when p_status = 'scanning' then scan_attempts + 1 else scan_attempts end,
      scan_started_at = case when p_status = 'scanning' then now() else scan_started_at end,
      scan_completed_at = case when p_status in ('clean', 'infected', 'error') then now() else scan_completed_at end
  where id = p_document_id and storage_bucket = 'booking-quarantine';
  if not found then
    raise exception 'Quarantined document not found' using errcode = 'P0002';
  end if;
  history_action := case p_status
    when 'scanning' then 'scan_started'
    when 'clean' then 'scan_clean'
    when 'infected' then 'scan_infected'
    else 'scan_error'
  end;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (p_document_id, history_action, trim(p_reason), (select auth.uid()));
  perform set_config('app.phase8_command', '', true);
end;
$$;

create or replace function public.release_clean_booking_document(
  p_document_id uuid,
  p_private_path text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  document_record public.documents;
begin
  if not (public.is_administrator() or current_user = 'service_role') then
    raise exception 'Administrator or scanner service access is required' using errcode = '42501';
  end if;
  if p_private_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then
    raise exception 'Invalid released document path' using errcode = '22023';
  end if;
  if char_length(trim(p_reason)) < 2 or char_length(trim(p_reason)) > 2000 then
    raise exception 'Release evidence is required' using errcode = '22023';
  end if;
  select * into document_record from public.documents
  where id = p_document_id and scan_status = 'clean' and storage_bucket = 'booking-quarantine'
  for update;
  if not found then
    raise exception 'A clean quarantined document is required before release' using errcode = '23514';
  end if;
  if split_part(p_private_path, '/', 1) <> document_record.booking_id::text then
    raise exception 'Released document path must belong to the booking' using errcode = '22023';
  end if;

  perform set_config('app.phase8_command', 'yes', true);
  update public.documents
  set storage_bucket = 'booking-private', storage_path = p_private_path,
      scan_status = 'released', released_at = now(), scanner_detail = trim(p_reason)
  where id = p_document_id;
  if document_record.requirement_id is not null then
    update public.booking_document_requirements
    set status = 'uploaded', verified_document_id = null, updated_at = now()
    where id = document_record.requirement_id;
  end if;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (p_document_id, 'released', trim(p_reason), (select auth.uid()));
  perform set_config('app.phase8_command', '', true);
end;
$$;

create or replace function public.register_trusted_generated_document(
  p_booking_id uuid,
  p_document_type public.document_type,
  p_title text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_retention_class text,
  p_content_sha256 text
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
  if current_user <> 'service_role' then
    raise exception 'Only the trusted document generator may register generated files' using errcode = '42501';
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
    scan_attempts, scan_started_at, scan_completed_at, released_at
  ) values (
    p_booking_id, requirement_record.id, p_document_type, trim(p_title),
    trim(p_original_filename), 'booking-private', p_storage_path, p_mime_type,
    p_size_bytes, next_version, p_retention_class, p_content_sha256,
    'released', 'Generated by the deterministic invoice service.', 0,
    now(), now(), now()
  ) returning id into document_id;
  if requirement_record.id is not null then
    update public.booking_document_requirements
    set status = 'uploaded', verified_document_id = null, updated_at = now()
    where id = requirement_record.id;
  end if;
  insert into public.document_history (document_id, action, reason)
  values (document_id, 'released', 'Deterministic application-generated file released directly to protected storage');
  perform set_config('app.phase8_command', '', true);
  return document_id;
end;
$$;

create or replace function public.review_booking_document(
  p_document_id uuid,
  p_approved boolean,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  document_record public.documents;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A review reason is required' using errcode = '22023';
  end if;
  select * into document_record from public.documents where id = p_document_id for update;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  if document_record.scan_status <> 'released' then
    raise exception 'Only a clean, released document can be reviewed' using errcode = '23514';
  end if;
  perform set_config('app.phase8_command', 'yes', true);
  update public.documents
  set verification_status = case
        when p_approved then 'verified'::public.document_verification_status
        else 'rejected'::public.document_verification_status
      end,
      verification_notes = trim(p_reason), verified_by = (select auth.uid()), verified_at = now()
  where id = p_document_id;
  if document_record.requirement_id is not null then
    update public.booking_document_requirements
    set status = case
          when p_approved then 'verified'::public.document_requirement_status
          else 'missing'::public.document_requirement_status
        end,
        verified_document_id = case when p_approved then p_document_id else null end,
        updated_at = now()
    where id = document_record.requirement_id;
  end if;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (
    p_document_id, case when p_approved then 'verified' else 'rejected' end,
    trim(p_reason), (select auth.uid())
  );
  perform set_config('app.phase8_command', '', true);
end;
$$;

revoke all on function public.register_booking_document(uuid,public.document_type,text,text,text,text,bigint,text) from authenticated;
revoke all on function public.register_quarantined_booking_document(uuid,public.document_type,text,text,text,text,bigint,text,text) from public, anon;
revoke all on function public.record_document_scan_result(uuid,public.document_scan_status,text) from public, anon;
revoke all on function public.release_clean_booking_document(uuid,text,text) from public, anon;
revoke all on function public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.register_quarantined_booking_document(uuid,public.document_type,text,text,text,text,bigint,text,text) to authenticated;
grant execute on function public.record_document_scan_result(uuid,public.document_scan_status,text) to authenticated, service_role;
grant execute on function public.release_clean_booking_document(uuid,text,text) to authenticated, service_role;
grant execute on function public.register_trusted_generated_document(uuid,public.document_type,text,text,text,text,bigint,text,text) to service_role;
