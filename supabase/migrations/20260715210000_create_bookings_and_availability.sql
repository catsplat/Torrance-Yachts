-- Phase 6: human-confirmed bookings, buffered yacht reservations, and Yachtfolio actions.

create type public.booking_status as enum (
  'confirmed', 'charter_active', 'completed', 'cancelled'
);
create type public.yachtfolio_action_status as enum ('pending', 'completed');

create sequence public.booking_reference_sequence start with 1 increment by 1;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'BKG-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.booking_reference_sequence')::text, 4, '0')
  ),
  enquiry_id uuid not null references public.enquiries (id) on delete restrict,
  source_offer_id uuid not null references public.offers (id) on delete restrict,
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  customer_contact_id uuid references public.contacts (id) on delete restrict,
  broker_contact_id uuid references public.contacts (id) on delete restrict,
  broker_company_id uuid references public.companies (id) on delete restrict,
  status public.booking_status not null default 'confirmed',
  charter_start_date date not null,
  charter_end_date date not null,
  embarkation_port text,
  disembarkation_port text,
  guest_count smallint check (guest_count is null or guest_count between 1 and 36),
  charter_fee numeric(14, 2) not null check (charter_fee > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(5, 2) not null check (tax_rate between 0 and 100),
  signed_agreement_confirmed_by uuid not null references public.profiles (id) on delete restrict,
  signed_agreement_confirmed_at timestamptz not null default now(),
  confirmation_reason text not null check (char_length(trim(confirmation_reason)) between 2 and 1000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_charter_date_order check (charter_end_date > charter_start_date),
  constraint bookings_ports_valid check (
    (embarkation_port is null or char_length(trim(embarkation_port)) between 2 and 120)
    and (disembarkation_port is null or char_length(trim(disembarkation_port)) between 2 and 120)
  )
);

create unique index bookings_one_active_per_enquiry_idx
  on public.bookings (enquiry_id) where status <> 'cancelled';
create unique index bookings_one_active_per_offer_idx
  on public.bookings (source_offer_id) where status <> 'cancelled';
create index bookings_status_dates_idx
  on public.bookings (status, charter_start_date, charter_end_date);
create index bookings_yacht_dates_idx
  on public.bookings (yacht_id, charter_start_date, charter_end_date);

create table public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  reserved_from date not null,
  reserved_through date not null,
  reservation_period daterange generated always as (
    daterange(reserved_from, reserved_through, '[]')
  ) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_reservation_date_order check (reserved_through >= reserved_from),
  constraint booking_reservations_no_overlap exclude using gist (
    yacht_id with =,
    reservation_period with &&
  ) where (active)
);

create index booking_reservations_yacht_dates_idx
  on public.booking_reservations (yacht_id, reserved_from, reserved_through) where active;

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete restrict,
  from_status public.booking_status,
  to_status public.booking_status not null,
  reason text not null check (char_length(trim(reason)) between 2 and 1000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at desc);

create table public.yachtfolio_booking_actions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  status public.yachtfolio_action_status not null default 'pending',
  completion_notes text check (
    completion_notes is null or char_length(trim(completion_notes)) between 2 and 2000
  ),
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yachtfolio_completion_fields check (
    (status = 'completed' and completed_by is not null and completed_at is not null and completion_notes is not null)
    or (status = 'pending' and completed_by is null and completed_at is null)
  )
);

create table public.yachtfolio_action_history (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.yachtfolio_booking_actions (id) on delete restrict,
  from_status public.yachtfolio_action_status,
  to_status public.yachtfolio_action_status not null,
  reason text not null check (char_length(trim(reason)) between 2 and 2000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index yachtfolio_action_history_action_idx
  on public.yachtfolio_action_history (action_id, created_at desc);

alter table public.bookings enable row level security;
alter table public.booking_reservations enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.yachtfolio_booking_actions enable row level security;
alter table public.yachtfolio_action_history enable row level security;

create or replace function public.is_valid_enquiry_transition(
  current_status public.enquiry_status,
  target_status public.enquiry_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case current_status
    when 'new' then target_status in ('waiting_for_reply', 'offer_sent', 'cancelled', 'archived')
    when 'waiting_for_reply' then target_status in ('new', 'offer_sent', 'cancelled', 'archived')
    when 'offer_sent' then target_status in (
      'waiting_for_reply', 'negotiating', 'contract_issued', 'cancelled', 'archived'
    )
    when 'negotiating' then target_status in ('offer_sent', 'contract_issued', 'cancelled', 'archived')
    when 'contract_issued' then target_status in ('negotiating', 'awaiting_signatures', 'cancelled', 'archived')
    when 'awaiting_signatures' then target_status in ('negotiating', 'contract_issued', 'booked', 'cancelled', 'archived')
    when 'booked' then target_status in ('charter_active', 'cancelled')
    when 'charter_active' then target_status in ('completed', 'cancelled')
    when 'completed' then target_status = 'archived'
    when 'cancelled' then target_status = 'archived'
    else false
  end;
$$;

create or replace function public.normalise_booking()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.embarkation_port := nullif(trim(new.embarkation_port), '');
  new.disembarkation_port := nullif(trim(new.disembarkation_port), '');
  new.currency := upper(trim(new.currency));
  new.confirmation_reason := trim(new.confirmation_reason);
  return new;
end;
$$;

create or replace function public.guard_booking_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and current_setting('app.booking_create_authorised', true) is distinct from 'yes' then
    raise exception 'Bookings must be created through the confirmation command' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and current_setting('app.booking_update_authorised', true) is distinct from 'yes' then
    raise exception 'Bookings must be changed through a controlled command' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.reference := old.reference;
    new.enquiry_id := old.enquiry_id;
    new.source_offer_id := old.source_offer_id;
    new.signed_agreement_confirmed_by := old.signed_agreement_confirmed_by;
    new.signed_agreement_confirmed_at := old.signed_agreement_confirmed_at;
    new.confirmation_reason := old.confirmation_reason;
  end if;
  return new;
end;
$$;

create or replace function public.guard_booking_reservation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.booking_reservation_authorised', true) is distinct from 'yes' then
    raise exception 'Reservations are maintained by booking commands' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.booking_id := old.booking_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.guard_yachtfolio_action()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.yachtfolio_action_authorised', true) is distinct from 'yes' then
    raise exception 'Yachtfolio actions must be changed through a controlled command' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.record_booking_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  transition_reason text;
  event_name text;
begin
  if tg_op = 'INSERT' then
    transition_reason := new.confirmation_reason;
    event_name := 'BookingConfirmed';
  elsif new.status is distinct from old.status then
    transition_reason := nullif(current_setting('app.booking_transition_reason', true), '');
    event_name := case new.status
      when 'charter_active' then 'CharterStarted'
      when 'completed' then 'CharterEnded'
      when 'cancelled' then 'BookingCancelled'
      else 'BookingStatusChanged'
    end;
  else
    return new;
  end if;
  if transition_reason is null then
    raise exception 'A reason is required for every booking lifecycle change' using errcode = '23514';
  end if;
  insert into public.booking_status_history (booking_id, from_status, to_status, reason, changed_by)
  values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, transition_reason, (select auth.uid()));
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values (event_name, 'booking', new.id, (select auth.uid()), jsonb_build_object(
    'reference', new.reference, 'enquiry_id', new.enquiry_id, 'yacht_id', new.yacht_id,
    'from_status', case when tg_op = 'INSERT' then null else old.status end,
    'to_status', new.status, 'reason', transition_reason
  ));
  return new;
end;
$$;

create or replace function public.record_booking_amendment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare change_reason text;
begin
  if new.status is not distinct from old.status and to_jsonb(new) - array['updated_at','updated_by'] is distinct from to_jsonb(old) - array['updated_at','updated_by'] then
    change_reason := nullif(current_setting('app.booking_amendment_reason', true), '');
    if change_reason is null then raise exception 'A reason is required for booking amendments' using errcode = '23514'; end if;
    insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
    values ('BookingAmended', 'booking', new.id, (select auth.uid()), jsonb_build_object(
      'reference', new.reference, 'reason', change_reason,
      'old_charter_start_date', old.charter_start_date, 'new_charter_start_date', new.charter_start_date,
      'old_charter_end_date', old.charter_end_date, 'new_charter_end_date', new.charter_end_date,
      'old_yacht_id', old.yacht_id, 'new_yacht_id', new.yacht_id
    ));
  end if;
  return new;
end;
$$;

create trigger a_normalise_booking before insert or update on public.bookings
  for each row execute function public.normalise_booking();
create trigger b_guard_booking before insert or update on public.bookings
  for each row execute function public.guard_booking_mutation();
create trigger c_set_booking_audit before insert or update on public.bookings
  for each row execute function public.set_directory_audit_fields();
create trigger audit_booking after insert or update on public.bookings
  for each row execute function public.audit_directory_change('booking');
create trigger record_booking_lifecycle after insert or update on public.bookings
  for each row execute function public.record_booking_lifecycle();
create trigger record_booking_amendment after update on public.bookings
  for each row execute function public.record_booking_amendment();
create trigger guard_booking_reservation before insert or update on public.booking_reservations
  for each row execute function public.guard_booking_reservation();
create trigger guard_yachtfolio_action before insert or update on public.yachtfolio_booking_actions
  for each row execute function public.guard_yachtfolio_action();
create trigger set_yachtfolio_audit before insert or update on public.yachtfolio_booking_actions
  for each row execute function public.set_directory_audit_fields();
create trigger audit_yachtfolio_action after insert or update on public.yachtfolio_booking_actions
  for each row execute function public.audit_directory_change('yachtfolio_booking_action');

create or replace function public.confirm_booking(
  p_enquiry_id uuid,
  p_source_offer_id uuid,
  p_yacht_id uuid,
  p_charter_start_date date,
  p_charter_end_date date,
  p_embarkation_port text,
  p_disembarkation_port text,
  p_guest_count smallint,
  p_charter_fee numeric,
  p_currency text,
  p_tax_rate numeric,
  p_signed_agreement_confirmed boolean,
  p_confirmation_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare
  enquiry_record public.enquiries;
  offer_record public.offers;
  created_booking public.bookings;
  clean_reason text := nullif(trim(p_confirmation_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if p_signed_agreement_confirmed is not true then raise exception 'All required signatures must be explicitly confirmed' using errcode = '23514'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A confirmation reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if p_charter_start_date is null or p_charter_end_date <= p_charter_start_date then raise exception 'Valid charter dates are required' using errcode = '22023'; end if;
  if p_charter_fee <= 0 or upper(trim(p_currency)) !~ '^[A-Z]{3}$' or p_tax_rate not between 0 and 100 then raise exception 'Valid reviewed commercial terms are required' using errcode = '22023'; end if;

  select * into enquiry_record from public.enquiries where id = p_enquiry_id for update;
  if not found then raise exception 'Enquiry not found or not accessible' using errcode = 'P0002'; end if;
  if enquiry_record.status <> 'awaiting_signatures' then raise exception 'The enquiry must be awaiting signatures' using errcode = '23514'; end if;
  if enquiry_record.requested_yacht_id <> p_yacht_id then raise exception 'The confirmed yacht must match the reviewed enquiry' using errcode = '23514'; end if;

  select * into offer_record from public.offers where id = p_source_offer_id;
  if not found or offer_record.status <> 'sent' or offer_record.enquiry_id <> p_enquiry_id or offer_record.yacht_id <> p_yacht_id then
    raise exception 'A sent offer for this enquiry and yacht is required' using errcode = '23514';
  end if;

  perform set_config('app.booking_create_authorised', 'yes', true);
  insert into public.bookings (
    enquiry_id, source_offer_id, yacht_id, customer_contact_id, broker_contact_id,
    broker_company_id, charter_start_date, charter_end_date, embarkation_port,
    disembarkation_port, guest_count, charter_fee, currency, tax_rate,
    signed_agreement_confirmed_by, confirmation_reason
  ) values (
    p_enquiry_id, p_source_offer_id, p_yacht_id, enquiry_record.customer_contact_id,
    enquiry_record.broker_contact_id, enquiry_record.broker_company_id,
    p_charter_start_date, p_charter_end_date, p_embarkation_port,
    p_disembarkation_port, p_guest_count, p_charter_fee, upper(trim(p_currency)),
    p_tax_rate, (select auth.uid()), clean_reason
  ) returning * into created_booking;
  perform set_config('app.booking_create_authorised', '', true);

  perform set_config('app.booking_reservation_authorised', 'yes', true);
  insert into public.booking_reservations (booking_id, yacht_id, reserved_from, reserved_through)
  values (created_booking.id, p_yacht_id, p_charter_start_date - 1, p_charter_end_date + 1);
  perform set_config('app.booking_reservation_authorised', '', true);

  perform set_config('app.yachtfolio_action_authorised', 'yes', true);
  insert into public.yachtfolio_booking_actions (booking_id) values (created_booking.id);
  perform set_config('app.yachtfolio_action_authorised', '', true);

  perform set_config('app.booking_enquiry_transition_authorised', 'yes', true);
  perform public.transition_enquiry_status(p_enquiry_id, 'booked', clean_reason);
  perform set_config('app.booking_enquiry_transition_authorised', '', true);
  return created_booking;
end;
$$;

create or replace function public.transition_booking_status(
  p_booking_id uuid, p_new_status public.booking_status, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare current_booking public.bookings; updated_booking public.bookings; target_enquiry_status public.enquiry_status; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  if not ((current_booking.status = 'confirmed' and p_new_status in ('charter_active','cancelled')) or (current_booking.status = 'charter_active' and p_new_status in ('completed','cancelled'))) then
    raise exception 'Invalid booking status transition' using errcode = '23514';
  end if;
  perform set_config('app.booking_update_authorised', 'yes', true);
  perform set_config('app.booking_transition_reason', clean_reason, true);
  update public.bookings set status = p_new_status where id = p_booking_id returning * into updated_booking;
  perform set_config('app.booking_update_authorised', '', true);
  perform set_config('app.booking_transition_reason', '', true);
  if p_new_status = 'cancelled' then
    perform set_config('app.booking_reservation_authorised', 'yes', true);
    update public.booking_reservations set active = false where booking_id = p_booking_id;
    perform set_config('app.booking_reservation_authorised', '', true);
  end if;
  target_enquiry_status := case p_new_status
    when 'charter_active' then 'charter_active'::public.enquiry_status
    when 'completed' then 'completed'::public.enquiry_status
    else 'cancelled'::public.enquiry_status
  end;
  perform set_config('app.booking_enquiry_transition_authorised', 'yes', true);
  perform public.transition_enquiry_status(current_booking.enquiry_id, target_enquiry_status, clean_reason);
  perform set_config('app.booking_enquiry_transition_authorised', '', true);
  return updated_booking;
end;
$$;

create or replace function public.amend_confirmed_booking(
  p_booking_id uuid, p_yacht_id uuid, p_charter_start_date date, p_charter_end_date date,
  p_embarkation_port text, p_disembarkation_port text, p_guest_count smallint,
  p_charter_fee numeric, p_currency text, p_tax_rate numeric, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare locked_booking_id uuid; updated_booking public.bookings; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'An amendment reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if p_charter_end_date <= p_charter_start_date or p_charter_fee <= 0 or upper(trim(p_currency)) !~ '^[A-Z]{3}$' or p_tax_rate not between 0 and 100 then raise exception 'Valid reviewed booking details are required' using errcode = '22023'; end if;
  select id into locked_booking_id from public.bookings where id = p_booking_id and status = 'confirmed' for update;
  if locked_booking_id is null then raise exception 'Only a confirmed booking can be amended' using errcode = '23514'; end if;
  perform set_config('app.booking_reservation_authorised', 'yes', true);
  update public.booking_reservations set yacht_id = p_yacht_id, reserved_from = p_charter_start_date - 1, reserved_through = p_charter_end_date + 1 where booking_id = p_booking_id;
  perform set_config('app.booking_reservation_authorised', '', true);
  perform set_config('app.booking_update_authorised', 'yes', true);
  perform set_config('app.booking_amendment_reason', clean_reason, true);
  update public.bookings set yacht_id = p_yacht_id, charter_start_date = p_charter_start_date, charter_end_date = p_charter_end_date, embarkation_port = p_embarkation_port, disembarkation_port = p_disembarkation_port, guest_count = p_guest_count, charter_fee = p_charter_fee, currency = upper(trim(p_currency)), tax_rate = p_tax_rate where id = p_booking_id returning * into updated_booking;
  perform set_config('app.booking_update_authorised', '', true);
  perform set_config('app.booking_amendment_reason', '', true);
  return updated_booking;
end;
$$;

create or replace function public.set_yachtfolio_action_status(
  p_action_id uuid, p_new_status public.yachtfolio_action_status, p_reason text
)
returns public.yachtfolio_booking_actions language plpgsql security invoker set search_path = '' as $$
declare old_action public.yachtfolio_booking_actions; updated_action public.yachtfolio_booking_actions; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A reason between 2 and 2000 characters is required' using errcode = '22023'; end if;
  select * into old_action from public.yachtfolio_booking_actions where id = p_action_id for update;
  if not found then raise exception 'Yachtfolio action not found or not accessible' using errcode = 'P0002'; end if;
  if old_action.status = p_new_status then raise exception 'The Yachtfolio action already has this status' using errcode = '23514'; end if;
  perform set_config('app.yachtfolio_action_authorised', 'yes', true);
  update public.yachtfolio_booking_actions set status = p_new_status, completion_notes = case when p_new_status = 'completed' then clean_reason else null end, completed_by = case when p_new_status = 'completed' then (select auth.uid()) else null end, completed_at = case when p_new_status = 'completed' then now() else null end where id = p_action_id returning * into updated_action;
  perform set_config('app.yachtfolio_action_authorised', '', true);
  insert into public.yachtfolio_action_history (action_id, from_status, to_status, reason, changed_by) values (p_action_id, old_action.status, p_new_status, clean_reason, (select auth.uid()));
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload) values (case when p_new_status = 'completed' then 'YachtfolioBookingRecorded' else 'YachtfolioActionReopened' end, 'booking', old_action.booking_id, (select auth.uid()), jsonb_build_object('action_id', p_action_id, 'reason', clean_reason));
  return updated_action;
end;
$$;

alter function public.set_yachtfolio_action_status(
  uuid, public.yachtfolio_action_status, text
) security definer;

create or replace function public.check_yacht_availability(
  p_yacht_id uuid, p_charter_start_date date, p_charter_end_date date, p_exclude_booking_id uuid default null
)
returns table (available boolean, conflicting_booking_id uuid, conflicting_reference text, reserved_from date, reserved_through date)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  return query
  with conflicts as (
    select r.booking_id, b.reference, r.reserved_from, r.reserved_through
    from public.booking_reservations r join public.bookings b on b.id = r.booking_id
    where r.yacht_id = p_yacht_id and r.active
      and r.booking_id is distinct from p_exclude_booking_id
      and r.reservation_period && daterange(p_charter_start_date - 1, p_charter_end_date + 1, '[]')
    order by r.reserved_from limit 1
  )
  select not exists(select 1 from conflicts), c.booking_id, c.reference, c.reserved_from, c.reserved_through from conflicts c
  union all
  select true, null::uuid, null::text, null::date, null::date where not exists(select 1 from conflicts);
end;
$$;

create or replace function public.transition_enquiry_status(p_enquiry_id uuid, p_new_status public.enquiry_status, p_reason text)
returns public.enquiries language plpgsql security invoker set search_path = '' as $$
declare current_enquiry public.enquiries; updated_enquiry public.enquiries; clean_reason text;
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  clean_reason := nullif(trim(p_reason), '');
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A transition reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  select * into current_enquiry from public.enquiries where id = p_enquiry_id;
  if not found then raise exception 'Enquiry not found or not accessible' using errcode = 'P0002'; end if;
  if p_new_status = 'offer_sent' and current_setting('app.offer_sent_transition_authorised', true) is distinct from 'yes' then raise exception 'Offer sent state requires a human-recorded sent offer' using errcode = '42501'; end if;
  if p_new_status in ('booked','charter_active','completed') and public.is_valid_enquiry_transition(current_enquiry.status, p_new_status) and current_setting('app.booking_enquiry_transition_authorised', true) is distinct from 'yes' then raise exception 'Booking lifecycle states are controlled by booking commands' using errcode = '42501'; end if;
  if p_new_status = 'cancelled' and exists(select 1 from public.bookings where enquiry_id = p_enquiry_id and status <> 'cancelled') and current_setting('app.booking_enquiry_transition_authorised', true) is distinct from 'yes' then raise exception 'Cancel the active booking so its reservation is released' using errcode = '42501'; end if;
  perform set_config('app.enquiry_transition_authorised', 'yes', true);
  perform set_config('app.enquiry_transition_reason', clean_reason, true);
  update public.enquiries set status = p_new_status where id = p_enquiry_id returning * into updated_enquiry;
  if not found then raise exception 'Enquiry not found or not accessible' using errcode = 'P0002'; end if;
  return updated_enquiry;
end;
$$;

create policy "Active staff can view bookings" on public.bookings for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add bookings" on public.bookings for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update bookings" on public.bookings for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));
create policy "Active staff can view booking reservations" on public.booking_reservations for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add booking reservations" on public.booking_reservations for insert to authenticated with check ((select public.is_active_staff()));
create policy "Active staff can update booking reservations" on public.booking_reservations for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can view booking history" on public.booking_status_history for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can view Yachtfolio actions" on public.yachtfolio_booking_actions for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add Yachtfolio actions" on public.yachtfolio_booking_actions for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update Yachtfolio actions" on public.yachtfolio_booking_actions for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));
create policy "Active staff can view Yachtfolio action history" on public.yachtfolio_action_history for select to authenticated using ((select public.is_active_staff()));

revoke all on public.bookings, public.booking_reservations, public.booking_status_history, public.yachtfolio_booking_actions, public.yachtfolio_action_history from anon, authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.booking_reservations to authenticated;
grant select on public.booking_status_history to authenticated;
grant select, insert, update on public.yachtfolio_booking_actions to authenticated;
grant select on public.yachtfolio_action_history to authenticated;
grant usage, select on sequence public.booking_reference_sequence to authenticated;

revoke all on function public.confirm_booking(uuid,uuid,uuid,date,date,text,text,smallint,numeric,text,numeric,boolean,text) from public, anon;
revoke all on function public.transition_booking_status(uuid,public.booking_status,text) from public, anon;
revoke all on function public.amend_confirmed_booking(uuid,uuid,date,date,text,text,smallint,numeric,text,numeric,text) from public, anon;
revoke all on function public.set_yachtfolio_action_status(uuid,public.yachtfolio_action_status,text) from public, anon;
revoke all on function public.check_yacht_availability(uuid,date,date,uuid) from public, anon;
grant execute on function public.confirm_booking(uuid,uuid,uuid,date,date,text,text,smallint,numeric,text,numeric,boolean,text) to authenticated;
grant execute on function public.transition_booking_status(uuid,public.booking_status,text) to authenticated;
grant execute on function public.amend_confirmed_booking(uuid,uuid,date,date,text,text,smallint,numeric,text,numeric,text) to authenticated;
grant execute on function public.set_yachtfolio_action_status(uuid,public.yachtfolio_action_status,text) to authenticated;
grant execute on function public.check_yacht_availability(uuid,date,date,uuid) to authenticated;

revoke all on function public.normalise_booking(), public.guard_booking_mutation(), public.guard_booking_reservation(), public.guard_yachtfolio_action(), public.record_booking_lifecycle(), public.record_booking_amendment() from public, anon, authenticated;
