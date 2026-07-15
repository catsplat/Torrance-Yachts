-- Phase 4: manual enquiries, controlled lifecycle, append-only notes, and durable events.

create type public.enquiry_status as enum (
  'new',
  'waiting_for_reply',
  'offer_sent',
  'negotiating',
  'contract_issued',
  'awaiting_signatures',
  'booked',
  'charter_active',
  'completed',
  'archived',
  'cancelled'
);

create type public.enquiry_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.enquiry_source as enum ('manual', 'email', 'import');
create type public.enquiry_note_kind as enum ('internal', 'requirement', 'follow_up');

create sequence public.enquiry_reference_sequence start with 1 increment by 1;

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'ENQ-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.enquiry_reference_sequence')::text, 4, '0')
  ),
  customer_contact_id uuid references public.contacts (id) on delete restrict,
  broker_contact_id uuid references public.contacts (id) on delete restrict,
  broker_company_id uuid references public.companies (id) on delete restrict,
  requested_yacht_id uuid references public.yachts (id) on delete restrict,
  owner_user_id uuid references public.profiles (id) on delete restrict,
  status public.enquiry_status not null default 'new',
  priority public.enquiry_priority not null default 'normal',
  source public.enquiry_source not null default 'manual',
  summary text not null check (char_length(trim(summary)) between 2 and 2000),
  charter_start_date date,
  charter_end_date date,
  guest_count smallint check (guest_count is null or guest_count between 1 and 36),
  embarkation_port text check (
    embarkation_port is null or char_length(trim(embarkation_port)) between 2 and 120
  ),
  disembarkation_port text check (
    disembarkation_port is null or char_length(trim(disembarkation_port)) between 2 and 120
  ),
  budget_amount numeric(14, 2) check (budget_amount is null or budget_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_requester_required check (
    customer_contact_id is not null
    or broker_contact_id is not null
    or broker_company_id is not null
  ),
  constraint enquiries_charter_dates_together check (
    (charter_start_date is null and charter_end_date is null)
    or (charter_start_date is not null and charter_end_date is not null)
  ),
  constraint enquiries_charter_date_order check (
    charter_start_date is null or charter_end_date >= charter_start_date
  ),
  constraint enquiries_budget_currency_together check (
    (budget_amount is null and currency is null)
    or (budget_amount is not null and currency is not null)
  )
);

create index enquiries_status_updated_idx
  on public.enquiries (status, updated_at desc);
create index enquiries_owner_status_idx
  on public.enquiries (owner_user_id, status);
create index enquiries_yacht_dates_idx
  on public.enquiries (requested_yacht_id, charter_start_date, charter_end_date);
create index enquiries_customer_idx on public.enquiries (customer_contact_id);
create index enquiries_broker_idx on public.enquiries (broker_contact_id);

create table public.enquiry_status_history (
  id bigint generated always as identity primary key,
  enquiry_id uuid not null references public.enquiries (id) on delete restrict,
  from_status public.enquiry_status,
  to_status public.enquiry_status not null,
  reason text not null check (char_length(trim(reason)) between 2 and 1000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index enquiry_status_history_enquiry_idx
  on public.enquiry_status_history (enquiry_id, created_at desc);

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete restrict,
  kind public.enquiry_note_kind not null default 'internal',
  body text not null check (char_length(trim(body)) between 2 and 10000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index enquiry_notes_enquiry_idx
  on public.enquiry_notes (enquiry_id, created_at desc);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type ~ '^[A-Z][A-Za-z0-9]{1,79}$'),
  event_version smallint not null default 1 check (event_version > 0),
  aggregate_type text not null check (aggregate_type ~ '^[a-z][a-z_]{1,79}$'),
  aggregate_id uuid not null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index workflow_events_aggregate_idx
  on public.workflow_events (aggregate_type, aggregate_id, occurred_at desc);
create index workflow_events_type_idx
  on public.workflow_events (event_type, occurred_at desc);

alter table public.enquiries enable row level security;
alter table public.enquiry_status_history enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.workflow_events enable row level security;

create or replace function public.normalise_enquiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.summary := trim(new.summary);
  new.embarkation_port := nullif(trim(new.embarkation_port), '');
  new.disembarkation_port := nullif(trim(new.disembarkation_port), '');
  new.currency := nullif(upper(trim(new.currency)), '');
  return new;
end;
$$;

create or replace function public.normalise_enquiry_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.body := trim(new.body);
  return new;
end;
$$;

create or replace function public.validate_enquiry_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    (tg_op = 'INSERT' or new.customer_contact_id is distinct from old.customer_contact_id)
    and new.customer_contact_id is not null
    and not exists (
      select 1
      from public.contacts
      where id = new.customer_contact_id
        and active = true
        and roles && array['customer', 'charterer']::public.contact_role[]
    )
  ) then
    raise exception 'Customer must be an active customer or charterer contact'
      using errcode = '23514';
  end if;

  if (
    (tg_op = 'INSERT' or new.broker_contact_id is distinct from old.broker_contact_id)
    and new.broker_contact_id is not null
    and not exists (
      select 1
      from public.contacts
      where id = new.broker_contact_id
        and active = true
        and roles @> array['broker']::public.contact_role[]
    )
  ) then
    raise exception 'Broker must be an active broker contact'
      using errcode = '23514';
  end if;

  if (
    (tg_op = 'INSERT' or new.broker_company_id is distinct from old.broker_company_id)
    and new.broker_company_id is not null
    and not exists (
      select 1 from public.companies
      where id = new.broker_company_id and active = true
    )
  ) then
    raise exception 'Broker company must be active'
      using errcode = '23514';
  end if;

  if (
    (tg_op = 'INSERT' or new.requested_yacht_id is distinct from old.requested_yacht_id)
    and new.requested_yacht_id is not null
    and not exists (
      select 1 from public.yachts
      where id = new.requested_yacht_id and status <> 'inactive'
    )
  ) then
    raise exception 'Requested yacht must be operationally selectable'
      using errcode = '23514';
  end if;

  if (
    (tg_op = 'INSERT' or new.owner_user_id is distinct from old.owner_user_id)
    and new.owner_user_id is not null
    and not exists (
      select 1 from public.profiles
      where id = new.owner_user_id and active = true
    )
  ) then
    raise exception 'Enquiry owner must be an active internal user'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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
    when 'new' then target_status in (
      'waiting_for_reply', 'offer_sent', 'cancelled', 'archived'
    )
    when 'waiting_for_reply' then target_status in (
      'new', 'offer_sent', 'cancelled', 'archived'
    )
    when 'offer_sent' then target_status in (
      'waiting_for_reply', 'negotiating', 'contract_issued', 'cancelled', 'archived'
    )
    when 'negotiating' then target_status in (
      'offer_sent', 'contract_issued', 'cancelled', 'archived'
    )
    when 'contract_issued' then target_status in (
      'negotiating', 'awaiting_signatures', 'cancelled', 'archived'
    )
    when 'awaiting_signatures' then target_status in (
      'negotiating', 'contract_issued', 'cancelled', 'archived'
    )
    when 'booked' then target_status in ('charter_active', 'cancelled')
    when 'charter_active' then target_status = 'completed'
    when 'completed' then target_status = 'archived'
    when 'cancelled' then target_status = 'archived'
    else false
  end;
$$;

create or replace function public.guard_enquiry_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'new' then
    raise exception 'New enquiries must start in the new state'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if current_setting('app.enquiry_transition_authorised', true) is distinct from 'yes' then
      raise exception 'Enquiry status must be changed through the transition command'
        using errcode = '42501';
    end if;

    if not public.is_valid_enquiry_transition(old.status, new.status) then
      raise exception 'Invalid enquiry status transition from % to %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.record_enquiry_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_reason text;
begin
  if tg_op = 'INSERT' then
    transition_reason := 'Enquiry created';
  elsif new.status is distinct from old.status then
    transition_reason := nullif(
      current_setting('app.enquiry_transition_reason', true),
      ''
    );
  else
    return new;
  end if;

  if transition_reason is null then
    raise exception 'A reason is required for every enquiry status transition'
      using errcode = '23514';
  end if;

  insert into public.enquiry_status_history (
    enquiry_id,
    from_status,
    to_status,
    reason,
    changed_by
  )
  values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    transition_reason,
    (select auth.uid())
  );

  insert into public.workflow_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload
  )
  values (
    case when tg_op = 'INSERT' then 'EnquiryCreated' else 'EnquiryStatusChanged' end,
    'enquiry',
    new.id,
    (select auth.uid()),
    jsonb_build_object(
      'reference', new.reference,
      'from_status', case when tg_op = 'INSERT' then null else old.status end,
      'to_status', new.status,
      'reason', transition_reason
    )
  );

  return new;
end;
$$;

create or replace function public.transition_enquiry_status(
  p_enquiry_id uuid,
  p_new_status public.enquiry_status,
  p_reason text
)
returns public.enquiries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_enquiry public.enquiries;
  clean_reason text;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required'
      using errcode = '42501';
  end if;

  clean_reason := nullif(trim(p_reason), '');
  if clean_reason is null or char_length(clean_reason) > 1000 then
    raise exception 'A transition reason between 2 and 1000 characters is required'
      using errcode = '22023';
  end if;

  perform set_config('app.enquiry_transition_authorised', 'yes', true);
  perform set_config('app.enquiry_transition_reason', clean_reason, true);

  update public.enquiries
  set status = p_new_status
  where id = p_enquiry_id
  returning * into updated_enquiry;

  if not found then
    raise exception 'Enquiry not found or not accessible'
      using errcode = 'P0002';
  end if;

  return updated_enquiry;
end;
$$;

create trigger a_normalise_enquiry
  before insert or update on public.enquiries
  for each row execute function public.normalise_enquiry();
create trigger b_guard_enquiry_status
  before insert or update on public.enquiries
  for each row execute function public.guard_enquiry_status();
create trigger b_validate_enquiry_references
  before insert or update on public.enquiries
  for each row execute function public.validate_enquiry_references();
create trigger c_set_enquiry_audit_fields
  before insert or update on public.enquiries
  for each row execute function public.set_directory_audit_fields();
create trigger audit_enquiry_change
  after insert or update on public.enquiries
  for each row execute function public.audit_directory_change('enquiry');
create trigger record_enquiry_lifecycle
  after insert or update on public.enquiries
  for each row execute function public.record_enquiry_lifecycle();

create trigger a_normalise_enquiry_note
  before insert on public.enquiry_notes
  for each row execute function public.normalise_enquiry_note();
create trigger b_set_enquiry_note_audit_fields
  before insert on public.enquiry_notes
  for each row execute function public.set_directory_audit_fields();
create trigger audit_enquiry_note_change
  after insert on public.enquiry_notes
  for each row execute function public.audit_directory_change('enquiry_note');

create policy "Active staff can view enquiries"
  on public.enquiries for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add enquiries"
  on public.enquiries for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can update enquiries"
  on public.enquiries for update to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );

create policy "Active staff can view enquiry history"
  on public.enquiry_status_history for select to authenticated
  using ((select public.is_active_staff()));

create policy "Active staff can view enquiry notes"
  on public.enquiry_notes for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add enquiry notes"
  on public.enquiry_notes for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "Active staff can view workflow events"
  on public.workflow_events for select to authenticated
  using ((select public.is_active_staff()));

revoke all on public.enquiries from anon, authenticated;
revoke all on public.enquiry_status_history from anon, authenticated;
revoke all on public.enquiry_notes from anon, authenticated;
revoke all on public.workflow_events from anon, authenticated;
revoke all on sequence public.enquiry_reference_sequence from anon, authenticated;

grant select, insert, update on public.enquiries to authenticated;
grant select on public.enquiry_status_history to authenticated;
grant select, insert on public.enquiry_notes to authenticated;
grant select on public.workflow_events to authenticated;
grant usage, select on sequence public.enquiry_reference_sequence to authenticated;

revoke all on function public.normalise_enquiry() from public, anon, authenticated;
revoke all on function public.normalise_enquiry_note() from public, anon, authenticated;
revoke all on function public.validate_enquiry_references() from public, anon, authenticated;
revoke all on function public.guard_enquiry_status() from public, anon, authenticated;
revoke all on function public.record_enquiry_lifecycle() from public, anon, authenticated;
revoke all on function public.is_valid_enquiry_transition(
  public.enquiry_status,
  public.enquiry_status
) from public, anon;
revoke all on function public.transition_enquiry_status(
  uuid,
  public.enquiry_status,
  text
) from public, anon;

grant execute on function public.is_valid_enquiry_transition(
  public.enquiry_status,
  public.enquiry_status
) to authenticated;
grant execute on function public.transition_enquiry_status(
  uuid,
  public.enquiry_status,
  text
) to authenticated;
