-- Manual charters and operational availability holds. Existing enquiry-led
-- bookings remain unchanged; manual records are explicitly labelled instead of
-- being attached to synthetic enquiries or offers.

create type public.booking_origin as enum ('enquiry', 'manual');

alter table public.bookings
  add column origin public.booking_origin not null default 'enquiry',
  alter column enquiry_id drop not null,
  alter column source_offer_id drop not null;

alter table public.bookings
  add constraint bookings_origin_source_check check (
    (origin = 'enquiry' and enquiry_id is not null and source_offer_id is not null)
    or (origin = 'manual' and enquiry_id is null and source_offer_id is null)
  );

create table public.yacht_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'HOLD-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.booking_reference_sequence')::text, 4, '0')
  ),
  yacht_id uuid not null references public.yachts(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 240),
  notes text check (notes is null or char_length(trim(notes)) <= 5000),
  last_change_reason text check (last_change_reason is null or char_length(trim(last_change_reason)) between 2 and 1000),
  charter_start_date date not null,
  charter_end_date date not null,
  reserved_from date not null,
  reserved_through date not null,
  reservation_period daterange generated always as (daterange(reserved_from, reserved_through, '[]')) stored,
  status public.calendar_event_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yacht_availability_blocks_dates check (charter_end_date > charter_start_date),
  constraint yacht_availability_blocks_buffer check (
    reserved_from = charter_start_date - 1 and reserved_through = charter_end_date + 1
  ),
  constraint yacht_availability_blocks_no_overlap exclude using gist (
    yacht_id with =, reservation_period with &&
  ) where (status = 'active')
);

create index yacht_availability_blocks_yacht_dates_idx
  on public.yacht_availability_blocks(yacht_id, reserved_from, reserved_through)
  where status = 'active';

do $$
declare source_constraint text;
begin
  select conname into source_constraint from pg_constraint
  where conrelid = 'public.calendar_events'::regclass and pg_get_constraintdef(oid) like '%source_type%booking%payment%task%';
  if source_constraint is not null then execute format('alter table public.calendar_events drop constraint %I', source_constraint); end if;
end;
$$;
alter table public.calendar_events add constraint calendar_events_source_type_check
  check (source_type in ('booking', 'availability_block', 'payment', 'task'));

alter table public.yacht_availability_blocks enable row level security;
create policy "Active staff can view availability blocks" on public.yacht_availability_blocks
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create availability blocks" on public.yacht_availability_blocks
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()));
create policy "Active staff can update availability blocks" on public.yacht_availability_blocks
  for update to authenticated using ((select public.is_active_staff()))
  with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));

create or replace function public.guard_availability_block_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.availability_block_command', true) is distinct from 'yes' then
    raise exception 'Availability blocks must be changed through a controlled command' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_availability_block before insert or update on public.yacht_availability_blocks
  for each row execute function public.guard_availability_block_mutation();
create trigger set_availability_block_audit before insert or update on public.yacht_availability_blocks
  for each row execute function public.set_directory_audit_fields();
create trigger audit_availability_block after insert or update on public.yacht_availability_blocks
  for each row execute function public.audit_directory_change('yacht_availability_block');

create or replace function public.create_manual_booking(
  p_yacht_id uuid, p_charter_start_date date, p_charter_end_date date,
  p_embarkation_port text, p_disembarkation_port text, p_guest_count smallint,
  p_charter_fee numeric, p_currency text, p_tax_rate numeric,
  p_customer_contact_id uuid, p_broker_contact_id uuid, p_broker_company_id uuid,
  p_signed_agreement_confirmed boolean, p_confirmation_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare created_booking public.bookings; clean_reason text := nullif(trim(p_confirmation_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if p_signed_agreement_confirmed is not true then raise exception 'All required signatures must be explicitly confirmed' using errcode = '23514'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A confirmation record between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if p_charter_start_date is null or p_charter_end_date <= p_charter_start_date then raise exception 'Valid charter dates are required' using errcode = '22023'; end if;
  if p_charter_fee <= 0 or upper(trim(p_currency)) !~ '^[A-Z]{3}$' or p_tax_rate not between 0 and 100 then raise exception 'Valid reviewed commercial terms are required' using errcode = '22023'; end if;
  if not exists (select 1 from public.yachts where id = p_yacht_id and status = 'active') then raise exception 'An active yacht is required' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.task_templates where status = 'approved' and is_default) then raise exception 'An approved default task template is required' using errcode = '23514'; end if;

  perform set_config('app.booking_create_authorised', 'yes', true);
  insert into public.bookings (
    origin, yacht_id, customer_contact_id, broker_contact_id, broker_company_id,
    charter_start_date, charter_end_date, embarkation_port, disembarkation_port,
    guest_count, charter_fee, currency, tax_rate, signed_agreement_confirmed_by,
    confirmation_reason
  ) values (
    'manual', p_yacht_id, p_customer_contact_id, p_broker_contact_id, p_broker_company_id,
    p_charter_start_date, p_charter_end_date, p_embarkation_port, p_disembarkation_port,
    p_guest_count, p_charter_fee, upper(trim(p_currency)), p_tax_rate, (select auth.uid()), clean_reason
  ) returning * into created_booking;
  perform set_config('app.booking_create_authorised', '', true);
  perform set_config('app.booking_reservation_authorised', 'yes', true);
  insert into public.booking_reservations (booking_id, yacht_id, reserved_from, reserved_through)
  values (created_booking.id, p_yacht_id, p_charter_start_date - 1, p_charter_end_date + 1);
  perform set_config('app.booking_reservation_authorised', '', true);
  perform set_config('app.yachtfolio_action_authorised', 'yes', true);
  insert into public.yachtfolio_booking_actions (booking_id) values (created_booking.id);
  perform set_config('app.yachtfolio_action_authorised', '', true);
  perform public.generate_booking_tasks(created_booking.id);
  -- A confirmed charter must appear in the operational calendar immediately,
  -- rather than waiting for the next scheduler pass.
  perform public.refresh_operational_calendar();
  return created_booking;
end;
$$;

create or replace function public.create_yacht_availability_block(
  p_yacht_id uuid, p_title text, p_charter_start_date date, p_charter_end_date date, p_notes text
)
returns public.yacht_availability_blocks language plpgsql security invoker set search_path = '' as $$
declare created_block public.yacht_availability_blocks; clean_title text := nullif(trim(p_title), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_title is null or char_length(clean_title) > 240 or p_charter_end_date <= p_charter_start_date then raise exception 'A title and valid date range are required' using errcode = '22023'; end if;
  if not exists (select 1 from public.yachts where id = p_yacht_id and status = 'active') then raise exception 'An active yacht is required' using errcode = 'P0002'; end if;
  perform set_config('app.availability_block_command', 'yes', true);
  insert into public.yacht_availability_blocks (yacht_id, title, notes, charter_start_date, charter_end_date, reserved_from, reserved_through)
  values (p_yacht_id, clean_title, nullif(trim(p_notes), ''), p_charter_start_date, p_charter_end_date, p_charter_start_date - 1, p_charter_end_date + 1)
  returning * into created_block;
  perform set_config('app.availability_block_command', '', true);
  -- Holds are calendar-visible, but deliberately do not generate booking work.
  perform public.refresh_operational_calendar();
  return created_block;
end;
$$;

create or replace function public.amend_yacht_availability_block(
  p_block_id uuid, p_yacht_id uuid, p_title text, p_charter_start_date date, p_charter_end_date date, p_notes text, p_reason text
)
returns public.yacht_availability_blocks language plpgsql security invoker set search_path = '' as $$
declare updated_block public.yacht_availability_blocks; clean_title text := nullif(trim(p_title), ''); clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_title is null or char_length(clean_title) > 240 or p_charter_end_date <= p_charter_start_date then raise exception 'A title and valid date range are required' using errcode = '22023'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A change reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.yachts where id = p_yacht_id and status = 'active') then raise exception 'An active yacht is required' using errcode = 'P0002'; end if;
  if exists (select 1 from public.booking_reservations where yacht_id = p_yacht_id and active and reservation_period && daterange(p_charter_start_date - 1, p_charter_end_date + 1, '[]')) then raise exception 'These buffered dates conflict with an active booking' using errcode = '23P01'; end if;
  perform set_config('app.availability_block_command', 'yes', true);
  update public.yacht_availability_blocks
  set yacht_id = p_yacht_id, title = clean_title, notes = nullif(trim(p_notes), ''), charter_start_date = p_charter_start_date,
      charter_end_date = p_charter_end_date, reserved_from = p_charter_start_date - 1, reserved_through = p_charter_end_date + 1,
      last_change_reason = clean_reason
  where id = p_block_id and status = 'active'
  returning * into updated_block;
  perform set_config('app.availability_block_command', '', true);
  if not found then raise exception 'Active availability block not found' using errcode = 'P0002'; end if;
  perform public.refresh_operational_calendar();
  return updated_block;
end;
$$;

create or replace function public.cancel_yacht_availability_block(p_block_id uuid, p_reason text)
returns public.yacht_availability_blocks language plpgsql security invoker set search_path = '' as $$
declare updated_block public.yacht_availability_blocks; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A cancellation reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  perform set_config('app.availability_block_command', 'yes', true);
  update public.yacht_availability_blocks set status = 'cancelled', last_change_reason = clean_reason where id = p_block_id and status = 'active' returning * into updated_block;
  perform set_config('app.availability_block_command', '', true);
  if not found then raise exception 'Active availability block not found' using errcode = 'P0002'; end if;
  perform public.refresh_operational_calendar();
  return updated_block;
end;
$$;

create or replace function public.check_yacht_availability(
  p_yacht_id uuid, p_charter_start_date date, p_charter_end_date date, p_exclude_booking_id uuid default null
)
returns table (available boolean, conflicting_booking_id uuid, conflicting_reference text, reserved_from date, reserved_through date)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  return query with conflicts as (
    select r.booking_id as conflicting_id, b.reference, r.reserved_from, r.reserved_through
    from public.booking_reservations r join public.bookings b on b.id = r.booking_id
    where r.yacht_id = p_yacht_id and r.active and r.booking_id is distinct from p_exclude_booking_id
      and r.reservation_period && daterange(p_charter_start_date - 1, p_charter_end_date + 1, '[]')
    union all
    select h.id, h.reference, h.reserved_from, h.reserved_through
    from public.yacht_availability_blocks h
    where h.yacht_id = p_yacht_id and h.status = 'active'
      and h.reservation_period && daterange(p_charter_start_date - 1, p_charter_end_date + 1, '[]')
    order by reserved_from limit 1
  )
  select not exists(select 1 from conflicts), c.conflicting_id, c.reference, c.reserved_from, c.reserved_through from conflicts c
  union all select true, null::uuid, null::text, null::date, null::date where not exists(select 1 from conflicts);
end;
$$;

-- Keep template subjects optional: blank means the content is designed for a reply in an existing thread.
alter table public.communication_templates drop constraint communication_templates_subject_template_check;
alter table public.communication_templates add constraint communication_templates_subject_template_check
  check (char_length(trim(subject_template)) <= 300);

create or replace function public.validate_communication_template_placeholders(
  p_kind public.communication_template_kind, p_subject text, p_body text
) returns void language plpgsql immutable set search_path = '' as $$
declare placeholder_match text[]; allowed text[];
begin
  allowed := case p_kind
    when 'kyc_request' then array['broker_company_name', 'client_name', 'year', 'passport_country', 'residency_country']
    when 'captain_contact' then array['broker_name', 'yacht_name', 'captain_name', 'captain_email', 'captain_phone']
    when 'broker_follow_up' then array['broker_name', 'yacht_name', 'charter_start_date', 'charter_end_date']
  end;
  for placeholder_match in select regexp_matches(coalesce(p_subject, '') || E'\n' || coalesce(p_body, ''), E'\\{\\{([a-z_]+)\\}\\}', 'g') loop
    if not (placeholder_match[1] = any(allowed)) then raise exception 'Unknown communication template placeholder: %', placeholder_match[1] using errcode = '23514'; end if;
  end loop;
end;
$$;

revoke all on public.yacht_availability_blocks from anon;
grant select, insert, update on public.yacht_availability_blocks to authenticated;
revoke all on function public.create_manual_booking(uuid,date,date,text,text,smallint,numeric,text,numeric,uuid,uuid,uuid,boolean,text), public.create_yacht_availability_block(uuid,text,date,date,text), public.amend_yacht_availability_block(uuid,uuid,text,date,date,text,text), public.cancel_yacht_availability_block(uuid,text) from public, anon;
grant execute on function public.create_manual_booking(uuid,date,date,text,text,smallint,numeric,text,numeric,uuid,uuid,uuid,boolean,text), public.create_yacht_availability_block(uuid,text,date,date,text), public.amend_yacht_availability_block(uuid,uuid,text,date,date,text,text), public.cancel_yacht_availability_block(uuid,text) to authenticated;

create or replace function public.transition_booking_status(
  p_booking_id uuid, p_new_status public.booking_status, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare current_booking public.bookings; updated_booking public.bookings; target_enquiry_status public.enquiry_status; clean_reason text := nullif(trim(p_reason), ''); cancellation_task public.tasks;
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  if not ((current_booking.status = 'confirmed' and p_new_status in ('charter_active','cancelled')) or (current_booking.status = 'charter_active' and p_new_status in ('completed','cancelled'))) then raise exception 'Invalid booking status transition' using errcode = '23514'; end if;
  perform set_config('app.booking_update_authorised', 'yes', true); perform set_config('app.booking_transition_reason', clean_reason, true);
  update public.bookings set status = p_new_status where id = p_booking_id returning * into updated_booking;
  perform set_config('app.booking_update_authorised', '', true); perform set_config('app.booking_transition_reason', '', true);
  if p_new_status = 'cancelled' then
    perform set_config('app.booking_reservation_authorised', 'yes', true); update public.booking_reservations set active = false where booking_id = p_booking_id; perform set_config('app.booking_reservation_authorised', '', true);
    perform set_config('app.task_update_authorised', 'yes', true);
    with targets as materialized (select id, status as old_status from public.tasks where booking_id = p_booking_id and status in ('blocked', 'ready')),
    cancelled as (update public.tasks task set status = 'cancelled', blocked_reason = null, cancelled_by = (select auth.uid()), cancelled_at = now() from targets where task.id = targets.id returning task.id, targets.old_status)
    insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by) select id, 'cancelled', old_status, 'cancelled', 'Booking cancelled: ' || clean_reason, (select auth.uid()) from cancelled;
    perform set_config('app.task_update_authorised', '', true); perform set_config('app.task_create_authorised', 'yes', true);
    insert into public.tasks (booking_id, source, title, description, status, priority, required, created_by, updated_by) values (p_booking_id, 'ad_hoc', 'Confirm cancellation', 'Confirm the cancellation has been communicated and recorded.', 'ready', 'high', true, (select auth.uid()), (select auth.uid())) returning * into cancellation_task;
    perform set_config('app.task_create_authorised', '', true);
    insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by) values (cancellation_task.id, 'created', null, 'ready', 'Created when booking was cancelled', (select auth.uid()));
  end if;
  if current_booking.enquiry_id is not null then
    target_enquiry_status := case p_new_status when 'charter_active' then 'charter_active'::public.enquiry_status when 'completed' then 'completed'::public.enquiry_status else 'cancelled'::public.enquiry_status end;
    perform set_config('app.booking_enquiry_transition_authorised', 'yes', true); perform public.transition_enquiry_status(current_booking.enquiry_id, target_enquiry_status, clean_reason); perform set_config('app.booking_enquiry_transition_authorised', '', true);
  end if;
  return updated_booking;
end;
$$;

alter function public.transition_booking_status(uuid,public.booking_status,text) security definer;

create or replace function public.refresh_operational_calendar()
returns integer language plpgsql security definer set search_path = '' as $$
declare changed_count integer := 0; calendar_enabled boolean;
begin
  calendar_enabled := exists (select 1 from public.integration_connections where provider = 'google_calendar' and enabled);
  perform set_config('app.phase11_command', 'yes', true);
  with source_rows as (
    select 'booking'::text source_type, b.id source_id, 'charter'::public.calendar_event_kind kind, b.reference || ' · ' || y.name || ' charter' title, 'Authoritative booking dates. No attendees are added automatically.' description, b.charter_start_date::timestamp at time zone 'Europe/London' start_at, (b.charter_end_date + 1)::timestamp at time zone 'Europe/London' end_at, case when b.status = 'cancelled' then 'cancelled'::public.calendar_event_status else 'active'::public.calendar_event_status end status from public.bookings b join public.yachts y on y.id = b.yacht_id
    union all select 'availability_block', h.id, 'charter'::public.calendar_event_kind, h.reference || ' · ' || y.name || ' · ' || h.title, h.notes, h.charter_start_date::timestamp at time zone 'Europe/London', (h.charter_end_date + 1)::timestamp at time zone 'Europe/London', h.status from public.yacht_availability_blocks h join public.yachts y on y.id = h.yacht_id
    union all select 'payment', p.id, 'payment'::public.calendar_event_kind, b.reference || ' · instalment ' || p.instalment_number || ' due', p.currency || ' ' || to_char(p.amount, 'FM999999999990.00'), p.due_date::timestamp at time zone 'Europe/London', (p.due_date + 1)::timestamp at time zone 'Europe/London', case when p.status = 'cancelled' then 'cancelled'::public.calendar_event_status else 'active'::public.calendar_event_status end from public.payment_schedules p join public.bookings b on b.id = p.booking_id
    union all select 'task', t.id, 'task'::public.calendar_event_kind, coalesce(t.step_code || ' · ', '') || t.title, t.reference || ' · ' || b.reference, t.due_date::timestamp at time zone 'Europe/London', (t.due_date + 1)::timestamp at time zone 'Europe/London', case when t.status = 'cancelled' then 'cancelled'::public.calendar_event_status else 'active'::public.calendar_event_status end from public.tasks t join public.bookings b on b.id = t.booking_id where t.due_date is not null
  ), upserted as (
    insert into public.calendar_events (source_type, source_id, kind, title, description, start_at, end_at, status, sync_status)
    select source_type, source_id, kind, title, description, start_at, end_at, status, case when calendar_enabled then 'pending'::public.calendar_sync_status else 'not_configured'::public.calendar_sync_status end from source_rows
    on conflict (source_type, source_id, kind) do update set title = excluded.title, description = excluded.description, start_at = excluded.start_at, end_at = excluded.end_at, status = excluded.status, revision = case when public.calendar_events.title is distinct from excluded.title or public.calendar_events.description is distinct from excluded.description or public.calendar_events.start_at is distinct from excluded.start_at or public.calendar_events.end_at is distinct from excluded.end_at or public.calendar_events.status is distinct from excluded.status then public.calendar_events.revision + 1 else public.calendar_events.revision end, sync_status = case when calendar_enabled and (public.calendar_events.title is distinct from excluded.title or public.calendar_events.description is distinct from excluded.description or public.calendar_events.start_at is distinct from excluded.start_at or public.calendar_events.end_at is distinct from excluded.end_at or public.calendar_events.status is distinct from excluded.status) then 'pending'::public.calendar_sync_status when not calendar_enabled then 'not_configured'::public.calendar_sync_status else public.calendar_events.sync_status end, updated_at = now() returning *
  ) select count(*) into changed_count from upserted;
  insert into public.integration_deliveries (provider, operation, idempotency_key, source_type, source_id, payload)
  select 'google_calendar', 'calendar_upsert', 'calendar:' || event.id::text || ':r' || event.revision, 'calendar_event', event.id, jsonb_build_object('event_id', replace(event.id::text, '-', ''), 'title', event.title, 'description', event.description, 'start', event.start_at, 'end', event.end_at, 'all_day', event.all_day, 'timezone', event.timezone, 'status', event.status, 'visibility', 'private', 'send_updates', 'none') from public.calendar_events event where calendar_enabled and event.sync_status in ('pending', 'failed') on conflict (idempotency_key) do nothing;
  perform set_config('app.phase11_command', '', true); return changed_count;
end;
$$;
