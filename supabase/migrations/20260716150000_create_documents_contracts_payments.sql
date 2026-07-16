-- Phase 8: private documents, reviewed contract data, payment schedules, and commission calculations.

create type public.document_type as enum (
  'charter_agreement',
  'broker_kyc_statement',
  'client_passport',
  'cdd_check',
  'kylian_commission_invoice',
  'broker_commission_invoice',
  'other'
);
create type public.document_verification_status as enum (
  'pending_review', 'verified', 'rejected'
);
create type public.document_requirement_status as enum (
  'missing', 'uploaded', 'verified', 'waived'
);
create type public.contract_review_status as enum ('draft', 'approved', 'superseded');
create type public.payment_status as enum ('scheduled', 'paid', 'cancelled');

create table public.booking_document_requirements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  document_type public.document_type not null,
  required boolean not null default true,
  status public.document_requirement_status not null default 'missing',
  waiver_reason text check (
    waiver_reason is null or char_length(trim(waiver_reason)) between 2 and 1000
  ),
  verified_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, document_type),
  constraint document_requirement_waiver_valid check (
    (status = 'waived' and waiver_reason is not null)
    or (status <> 'waived' and waiver_reason is null)
  )
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  requirement_id uuid references public.booking_document_requirements (id) on delete restrict,
  document_type public.document_type not null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  original_filename text not null check (char_length(trim(original_filename)) between 1 and 255),
  storage_bucket text not null default 'booking-private',
  storage_path text not null unique,
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  version_number integer not null default 1 check (version_number > 0),
  verification_status public.document_verification_status not null default 'pending_review',
  verification_notes text check (
    verification_notes is null or char_length(trim(verification_notes)) between 2 and 2000
  ),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  retention_class text not null default 'booking_record'
    check (retention_class in ('identity_sensitive', 'booking_record', 'financial_record', 'sales_material')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint document_verification_fields check (
    (verification_status = 'pending_review' and verified_by is null and verified_at is null)
    or (verification_status in ('verified', 'rejected') and verified_by is not null and verified_at is not null)
  ),
  unique (booking_id, document_type, version_number)
);

alter table public.booking_document_requirements
  add constraint booking_document_requirements_verified_document_fkey
  foreign key (verified_document_id) references public.documents (id) on delete restrict;

create index documents_booking_created_idx on public.documents (booking_id, created_at desc);
create index document_requirements_booking_status_idx
  on public.booking_document_requirements (booking_id, status);

create table public.document_history (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete restrict,
  action text not null check (action in ('uploaded', 'verified', 'rejected')),
  reason text not null check (char_length(trim(reason)) between 2 and 2000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index document_history_document_idx
  on public.document_history (document_id, created_at desc);

create table public.contract_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  source_document_id uuid not null references public.documents (id) on delete restrict,
  status public.contract_review_status not null default 'draft',
  charter_start_date date not null,
  charter_end_date date not null,
  embarkation_port text,
  disembarkation_port text,
  charter_fee numeric(14,2) not null check (charter_fee > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(5,2) not null check (tax_rate between 0 and 100),
  commission_rate numeric(5,2) not null default 2 check (commission_rate between 0 and 100),
  review_notes text not null check (char_length(trim(review_notes)) between 2 and 3000),
  approved_by uuid references public.profiles (id) on delete restrict,
  approved_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_review_date_order check (charter_end_date > charter_start_date),
  constraint contract_review_approval_fields check (
    (status = 'draft' and approved_by is null and approved_at is null)
    or (status in ('approved', 'superseded') and approved_by is not null and approved_at is not null)
  )
);

create unique index contract_reviews_one_draft_idx
  on public.contract_reviews (booking_id) where status = 'draft';
create unique index contract_reviews_one_approved_idx
  on public.contract_reviews (booking_id) where status = 'approved';

create table public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  contract_review_id uuid not null references public.contract_reviews (id) on delete restrict,
  instalment_number smallint not null check (instalment_number between 1 and 3),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'scheduled',
  paid_at timestamptz,
  notes text check (notes is null or char_length(trim(notes)) between 2 and 1000),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, instalment_number),
  constraint payment_paid_fields check (
    (status = 'paid' and paid_at is not null)
    or (status <> 'paid' and paid_at is null)
  )
);

create index payment_schedules_due_idx
  on public.payment_schedules (status, due_date);

create table public.commission_calculations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  contract_review_id uuid not null unique references public.contract_reviews (id) on delete restrict,
  basis_amount numeric(14,2) not null check (basis_amount > 0),
  rate numeric(5,2) not null check (rate between 0 and 100),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  calculation_version text not null default 'percentage-v1',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint commission_amount_deterministic check (
    amount = round(basis_amount * rate / 100, 2)
  )
);

create or replace function public.initialise_booking_document_requirements()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.booking_document_requirements (booking_id, document_type, required)
  values
    (new.id, 'charter_agreement', true),
    (new.id, 'broker_kyc_statement', true),
    (new.id, 'client_passport', true),
    (new.id, 'cdd_check', true),
    (new.id, 'kylian_commission_invoice', true),
    (new.id, 'broker_commission_invoice', false)
  on conflict do nothing;
  return new;
end;
$$;

create trigger initialise_booking_documents
  after insert on public.bookings
  for each row execute function public.initialise_booking_document_requirements();

create or replace function public.guard_phase8_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.phase8_command', true), '') <> 'yes' then
    raise exception 'Use the approved document and payment commands' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_documents before insert or update or delete on public.documents
  for each row execute function public.guard_phase8_direct_mutation();
create trigger guard_document_requirements before update or delete on public.booking_document_requirements
  for each row execute function public.guard_phase8_direct_mutation();
create trigger guard_document_history before insert or update or delete on public.document_history
  for each row execute function public.guard_phase8_direct_mutation();
create trigger guard_contract_reviews before insert or update or delete on public.contract_reviews
  for each row execute function public.guard_phase8_direct_mutation();
create trigger guard_payment_schedules before insert or update or delete on public.payment_schedules
  for each row execute function public.guard_phase8_direct_mutation();
create trigger guard_commission_calculations before insert or update or delete on public.commission_calculations
  for each row execute function public.guard_phase8_direct_mutation();

create or replace function public.register_booking_document(
  p_booking_id uuid,
  p_document_type public.document_type,
  p_title text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_retention_class text
)
returns uuid language plpgsql security definer set search_path = '' as $$
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
  if p_storage_path !~ ('^' || p_booking_id::text || '/[0-9a-f-]{36}/[^/]+$') then
    raise exception 'Invalid private document path' using errcode = '22023';
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
    storage_path, mime_type, size_bytes, version_number, retention_class, created_by
  ) values (
    p_booking_id, requirement_record.id, p_document_type, trim(p_title),
    trim(p_original_filename), p_storage_path, p_mime_type, p_size_bytes,
    next_version, p_retention_class, (select auth.uid())
  ) returning id into document_id;
  if requirement_record.id is not null then
    update public.booking_document_requirements
    set status = 'uploaded', verified_document_id = null, updated_at = now()
    where id = requirement_record.id;
  end if;
  insert into public.document_history (document_id, action, reason, changed_by)
  values (document_id, 'uploaded', 'Private document uploaded for review', (select auth.uid()));
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

create or replace function public.waive_booking_document_requirement(
  p_requirement_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A waiver reason is required' using errcode = '22023';
  end if;
  perform set_config('app.phase8_command', 'yes', true);
  update public.booking_document_requirements
  set status = 'waived', waiver_reason = trim(p_reason),
      verified_document_id = null, updated_at = now()
  where id = p_requirement_id and not required;
  if not found then
    raise exception 'Only an optional requirement can be waived' using errcode = '23514';
  end if;
  perform set_config('app.phase8_command', '', true);
end;
$$;

create or replace function public.save_contract_review(
  p_booking_id uuid,
  p_source_document_id uuid,
  p_charter_start_date date,
  p_charter_end_date date,
  p_embarkation_port text,
  p_disembarkation_port text,
  p_charter_fee numeric,
  p_currency text,
  p_tax_rate numeric,
  p_commission_rate numeric,
  p_review_notes text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  review_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.documents
    where id = p_source_document_id and booking_id = p_booking_id
      and document_type = 'charter_agreement' and verification_status = 'verified'
  ) then
    raise exception 'A verified charter agreement is required' using errcode = '23514';
  end if;
  perform set_config('app.phase8_command', 'yes', true);
  insert into public.contract_reviews (
    booking_id, source_document_id, charter_start_date, charter_end_date,
    embarkation_port, disembarkation_port, charter_fee, currency, tax_rate,
    commission_rate, review_notes, created_by
  ) values (
    p_booking_id, p_source_document_id, p_charter_start_date, p_charter_end_date,
    nullif(trim(p_embarkation_port), ''), nullif(trim(p_disembarkation_port), ''),
    p_charter_fee, upper(trim(p_currency)), p_tax_rate, p_commission_rate,
    trim(p_review_notes), (select auth.uid())
  )
  on conflict (booking_id) where status = 'draft'
  do update set
    source_document_id = excluded.source_document_id,
    charter_start_date = excluded.charter_start_date,
    charter_end_date = excluded.charter_end_date,
    embarkation_port = excluded.embarkation_port,
    disembarkation_port = excluded.disembarkation_port,
    charter_fee = excluded.charter_fee,
    currency = excluded.currency,
    tax_rate = excluded.tax_rate,
    commission_rate = excluded.commission_rate,
    review_notes = excluded.review_notes,
    updated_at = now()
  returning id into review_id;
  perform set_config('app.phase8_command', '', true);
  return review_id;
end;
$$;

create or replace function public.approve_contract_review(
  p_review_id uuid,
  p_payment_dates date[],
  p_payment_amounts numeric[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  review_record public.contract_reviews;
  payment_count integer;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  select * into review_record from public.contract_reviews
  where id = p_review_id and status = 'draft' for update;
  if not found then raise exception 'Draft contract review not found' using errcode = 'P0002'; end if;
  payment_count := coalesce(array_length(p_payment_dates, 1), 0);
  if payment_count < 1 or payment_count > 3
     or payment_count <> coalesce(array_length(p_payment_amounts, 1), 0) then
    raise exception 'Provide one to three matching payment dates and amounts' using errcode = '22023';
  end if;
  if exists (
    select 1 from generate_subscripts(p_payment_dates, 1) s
    where p_payment_dates[s] > review_record.charter_start_date
      or p_payment_amounts[s] <= 0
  ) then
    raise exception 'Payment schedule values are invalid' using errcode = '23514';
  end if;
  if round((select sum(value) from unnest(p_payment_amounts) value), 2)
     <> round(review_record.charter_fee, 2) then
    raise exception 'Payment instalments must equal the reviewed charter fee' using errcode = '23514';
  end if;

  perform set_config('app.phase8_command', 'yes', true);
  update public.contract_reviews
  set status = 'superseded'
  where booking_id = review_record.booking_id and status = 'approved';
  update public.contract_reviews
  set status = 'approved', approved_by = (select auth.uid()),
      approved_at = now(), updated_at = now()
  where id = p_review_id;
  delete from public.payment_schedules where booking_id = review_record.booking_id;
  for payment_index in 1..payment_count loop
    insert into public.payment_schedules (
      booking_id, contract_review_id, instalment_number, due_date,
      amount, currency, created_by, updated_by
    ) values (
      review_record.booking_id, review_record.id, payment_index, p_payment_dates[payment_index],
      p_payment_amounts[payment_index], review_record.currency, (select auth.uid()), (select auth.uid())
    );
  end loop;
  insert into public.commission_calculations (
    booking_id, contract_review_id, basis_amount, rate, amount, currency, created_by
  ) values (
    review_record.booking_id, review_record.id, review_record.charter_fee,
    review_record.commission_rate,
    round(review_record.charter_fee * review_record.commission_rate / 100, 2),
    review_record.currency, (select auth.uid())
  );
  perform set_config('app.phase8_command', '', true);

  perform set_config('app.booking_update_authorised', 'yes', true);
  perform set_config('app.booking_amendment_reason', 'Approved reviewed contract data', true);
  update public.bookings set
    charter_start_date = review_record.charter_start_date,
    charter_end_date = review_record.charter_end_date,
    embarkation_port = review_record.embarkation_port,
    disembarkation_port = review_record.disembarkation_port,
    charter_fee = review_record.charter_fee,
    currency = review_record.currency,
    tax_rate = review_record.tax_rate,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = review_record.booking_id;
  perform set_config('app.booking_update_authorised', '', true);
  perform set_config('app.booking_amendment_reason', '', true);

  perform set_config('app.booking_reservation_authorised', 'yes', true);
  update public.booking_reservations
  set reserved_from = review_record.charter_start_date - 1,
      reserved_through = review_record.charter_end_date + 1,
      updated_at = now()
  where booking_id = review_record.booking_id and active;
  perform set_config('app.booking_reservation_authorised', '', true);

  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks t set due_date = p.due_date
  from public.payment_schedules p
  where t.booking_id = review_record.booking_id
    and p.booking_id = t.booking_id
    and (
      (t.due_anchor = 'contract_payment_1' and p.instalment_number = 1)
      or (t.due_anchor = 'contract_payment_2' and p.instalment_number = 2)
      or (t.due_anchor = 'contract_payment_3' and p.instalment_number = 3)
    )
    and t.status in ('blocked', 'ready');
  update public.tasks set due_date = review_record.charter_start_date + due_offset_days
    where booking_id = review_record.booking_id and due_anchor = 'charter_start'
      and status in ('blocked', 'ready');
  update public.tasks set due_date = review_record.charter_end_date + due_offset_days
    where booking_id = review_record.booking_id and due_anchor = 'charter_end'
      and status in ('blocked', 'ready');
  perform set_config('app.task_update_authorised', '', true);
  perform public.refresh_booking_task_states(review_record.booking_id);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'ContractDataApproved', 'booking', review_record.booking_id, (select auth.uid()),
    jsonb_build_object(
      'contract_review_id', review_record.id,
      'payment_count', payment_count,
      'commission_amount', round(review_record.charter_fee * review_record.commission_rate / 100, 2)
    )
  );
end;
$$;

create or replace function public.mark_payment_paid(
  p_payment_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A payment note is required' using errcode = '22023';
  end if;
  perform set_config('app.phase8_command', 'yes', true);
  update public.payment_schedules
  set status = 'paid', paid_at = now(), notes = trim(p_reason),
      updated_by = (select auth.uid()), updated_at = now()
  where id = p_payment_id and status = 'scheduled';
  if not found then raise exception 'Scheduled payment not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase8_command', '', true);
end;
$$;

alter table public.booking_document_requirements enable row level security;
alter table public.documents enable row level security;
alter table public.document_history enable row level security;
alter table public.contract_reviews enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.commission_calculations enable row level security;

create policy "active staff read document requirements" on public.booking_document_requirements
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read document metadata" on public.documents
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read document history" on public.document_history
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read contract reviews" on public.contract_reviews
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read payment schedules" on public.payment_schedules
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read commissions" on public.commission_calculations
  for select to authenticated using ((select public.is_active_staff()));

revoke all on public.booking_document_requirements, public.documents, public.document_history,
  public.contract_reviews, public.payment_schedules, public.commission_calculations
  from public, anon;
grant select on public.booking_document_requirements, public.documents, public.document_history,
  public.contract_reviews, public.payment_schedules, public.commission_calculations
  to authenticated;

revoke all on function public.register_booking_document(uuid,public.document_type,text,text,text,text,bigint,text) from public, anon;
revoke all on function public.review_booking_document(uuid,boolean,text) from public, anon;
revoke all on function public.waive_booking_document_requirement(uuid,text) from public, anon;
revoke all on function public.save_contract_review(uuid,uuid,date,date,text,text,numeric,text,numeric,numeric,text) from public, anon;
revoke all on function public.approve_contract_review(uuid,date[],numeric[]) from public, anon;
revoke all on function public.mark_payment_paid(uuid,text) from public, anon;
grant execute on function public.register_booking_document(uuid,public.document_type,text,text,text,text,bigint,text) to authenticated;
grant execute on function public.review_booking_document(uuid,boolean,text) to authenticated;
grant execute on function public.waive_booking_document_requirement(uuid,text) to authenticated;
grant execute on function public.save_contract_review(uuid,uuid,date,date,text,text,numeric,text,numeric,numeric,text) to authenticated;
grant execute on function public.approve_contract_review(uuid,date[],numeric[]) to authenticated;
grant execute on function public.mark_payment_paid(uuid,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-private', 'booking-private', false, 20971520,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "active staff read private booking files"
on storage.objects for select to authenticated
using (
  bucket_id = 'booking-private'
  and (select public.is_active_staff())
  and exists (
    select 1 from public.bookings
    where id::text = (storage.foldername(name))[1]
  )
);

create policy "active staff upload private booking files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'booking-private'
  and (select public.is_active_staff())
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1 from public.bookings
    where id::text = (storage.foldername(name))[1]
  )
);

create policy "upload owners can remove failed private booking files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'booking-private'
  and (select public.is_active_staff())
  and owner_id = (select auth.uid()::text)
);
