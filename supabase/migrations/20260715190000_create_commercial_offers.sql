-- Phase 5: yacht commercial profiles, rates, approved materials, templates, and offers.

create extension if not exists btree_gist with schema extensions;

create type public.sales_material_type as enum (
  'brochure', 'crew_profiles', 'sample_menu', 'specifications', 'deck_plan', 'other'
);
create type public.offer_template_status as enum ('draft', 'approved', 'retired');
create type public.offer_status as enum (
  'draft', 'approved', 'sent', 'withdrawn', 'superseded'
);
create type public.offer_pricing_basis as enum ('seasonal_rate', 'manually_adjusted');

create table public.yacht_commercial_profiles (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null unique references public.yachts (id) on delete restrict,
  overview text not null check (char_length(trim(overview)) between 2 and 10000),
  port_guidance text check (
    port_guidance is null or char_length(trim(port_guidance)) between 2 and 5000
  ),
  fuel_consumption_lph numeric(8, 2) check (
    fuel_consumption_lph is null or fuel_consumption_lph > 0
  ),
  fuel_consumption_speed_knots numeric(5, 2) check (
    fuel_consumption_speed_knots is null or fuel_consumption_speed_knots > 0
  ),
  short_charter_divisor numeric(5, 2) not null default 6
    check (short_charter_divisor between 1 and 30),
  default_currency text not null default 'EUR'
    check (default_currency ~ '^[A-Z]{3}$'),
  default_tax_rate numeric(5, 2) not null default 0
    check (default_tax_rate between 0 and 100),
  key_features text[] not null default '{}'
    check (cardinality(key_features) <= 50),
  reference_notes text check (
    reference_notes is null or char_length(trim(reference_notes)) between 2 and 10000
  ),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yacht_commercial_profile_fuel_pair check (
    (fuel_consumption_lph is null and fuel_consumption_speed_knots is null)
    or (fuel_consumption_lph is not null and fuel_consumption_speed_knots is not null)
  )
);

create table public.yacht_rate_periods (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  valid_from date not null,
  valid_to date not null,
  weekly_rate numeric(14, 2) not null check (weekly_rate > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(5, 2) not null check (tax_rate between 0 and 100),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yacht_rate_period_date_order check (valid_to >= valid_from),
  constraint yacht_rate_periods_no_active_overlap exclude using gist (
    yacht_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  ) where (active)
);

create index yacht_rate_periods_yacht_dates_idx
  on public.yacht_rate_periods (yacht_id, valid_from, valid_to);

create table public.yacht_sales_materials (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  material_type public.sales_material_type not null,
  label text not null check (char_length(trim(label)) between 2 and 160),
  public_url text not null check (
    char_length(public_url) <= 2048 and public_url ~ '^https://'
  ),
  approved_for_offers boolean not null default false,
  active boolean not null default true,
  sort_order smallint not null default 0 check (sort_order between 0 and 1000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, public_url)
);

create index yacht_sales_materials_yacht_idx
  on public.yacht_sales_materials (yacht_id, active, approved_for_offers, sort_order);

create table public.yacht_offer_templates (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  version_number integer not null check (version_number > 0),
  name text not null check (char_length(trim(name)) between 2 and 120),
  subject_template text not null check (
    char_length(trim(subject_template)) between 2 and 300
  ),
  body_template text not null check (
    char_length(trim(body_template)) between 20 and 30000
  ),
  status public.offer_template_status not null default 'draft',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, version_number),
  constraint yacht_offer_template_approval_pair check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or (status <> 'approved')
  )
);

create unique index yacht_offer_templates_one_approved_idx
  on public.yacht_offer_templates (yacht_id) where status = 'approved';

create sequence public.offer_reference_sequence start with 1 increment by 1;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'OFF-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.offer_reference_sequence')::text, 4, '0')
  ),
  enquiry_id uuid not null references public.enquiries (id) on delete restrict,
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  template_version_id uuid not null references public.yacht_offer_templates (id) on delete restrict,
  rate_period_id uuid references public.yacht_rate_periods (id) on delete restrict,
  source_offer_id uuid references public.offers (id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status public.offer_status not null default 'draft',
  recipient_name text not null check (char_length(trim(recipient_name)) between 2 and 160),
  subject_snapshot text not null check (char_length(trim(subject_snapshot)) between 2 and 300),
  body_snapshot text not null check (char_length(trim(body_snapshot)) between 20 and 30000),
  charter_start_date date not null,
  charter_end_date date not null,
  charter_days smallint not null check (charter_days between 1 and 365),
  weekly_rate_snapshot numeric(14, 2) not null check (weekly_rate_snapshot > 0),
  proposed_charter_fee numeric(14, 2) not null check (proposed_charter_fee > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_rate_snapshot numeric(5, 2) not null check (tax_rate_snapshot between 0 and 100),
  short_charter_divisor_snapshot numeric(5, 2) not null
    check (short_charter_divisor_snapshot between 1 and 30),
  pricing_basis public.offer_pricing_basis not null default 'seasonal_rate',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  sent_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enquiry_id, version_number),
  constraint offers_charter_date_order check (charter_end_date > charter_start_date),
  constraint offers_approval_fields check (
    (status in ('approved', 'sent') and approved_by is not null and approved_at is not null)
    or status not in ('approved', 'sent')
  ),
  constraint offers_sent_fields check (
    (status = 'sent' and sent_by is not null and sent_at is not null)
    or status <> 'sent'
  )
);

create index offers_enquiry_version_idx on public.offers (enquiry_id, version_number desc);
create index offers_status_updated_idx on public.offers (status, updated_at desc);
create index offers_yacht_dates_idx on public.offers (yacht_id, charter_start_date, charter_end_date);

create table public.offer_status_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers (id) on delete restrict,
  from_status public.offer_status,
  to_status public.offer_status not null,
  reason text not null check (char_length(trim(reason)) between 2 and 1000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index offer_status_history_offer_idx
  on public.offer_status_history (offer_id, created_at desc);

alter table public.yacht_commercial_profiles enable row level security;
alter table public.yacht_rate_periods enable row level security;
alter table public.yacht_sales_materials enable row level security;
alter table public.yacht_offer_templates enable row level security;
alter table public.offers enable row level security;
alter table public.offer_status_history enable row level security;

create or replace function public.calculate_charter_fee(
  p_weekly_rate numeric,
  p_charter_days integer,
  p_short_charter_divisor numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    case
      when p_charter_days < 7
        then p_weekly_rate / p_short_charter_divisor * p_charter_days
      else p_weekly_rate / 7 * p_charter_days
    end,
    2
  );
$$;

create or replace function public.normalise_commercial_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'yacht_commercial_profiles' then
    new.overview := trim(new.overview);
    new.port_guidance := nullif(trim(new.port_guidance), '');
    new.default_currency := upper(trim(new.default_currency));
    new.reference_notes := nullif(trim(new.reference_notes), '');
    new.key_features := coalesce(array(
      select trim(value) from unnest(new.key_features) value where trim(value) <> ''
    ), '{}'::text[]);
  elsif tg_table_name = 'yacht_rate_periods' then
    new.name := trim(new.name);
    new.currency := upper(trim(new.currency));
  elsif tg_table_name = 'yacht_sales_materials' then
    new.label := trim(new.label);
    new.public_url := trim(new.public_url);
  elsif tg_table_name = 'yacht_offer_templates' then
    new.name := trim(new.name);
    new.subject_template := trim(new.subject_template);
    new.body_template := trim(new.body_template);
  end if;
  return new;
end;
$$;

create or replace function public.validate_offer_template_placeholders()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  placeholder_match text[];
  allowed_placeholders constant text[] := array[
    'customer_name', 'yacht_name', 'weekly_rate', 'proposed_charter_fee',
    'currency', 'tax_rate', 'charter_start_date', 'charter_end_date',
    'guest_count', 'embarkation_port', 'disembarkation_port', 'port_guidance',
    'yacht_overview', 'yacht_specifications', 'key_features', 'sales_materials',
    'references'
  ];
begin
  for placeholder_match in
    select regexp_matches(new.subject_template || E'\n' || new.body_template, '\{\{([a-z_]+)\}\}', 'g')
  loop
    if not (placeholder_match[1] = any(allowed_placeholders)) then
      raise exception 'Unknown offer template placeholder: %', placeholder_match[1]
        using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.assign_offer_template_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(version_number), 0) + 1 into new.version_number
    from public.yacht_offer_templates where yacht_id = new.yacht_id;
  end if;
  return new;
end;
$$;

create or replace function public.guard_offer_template()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Offer templates must start as drafts' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('approved', 'retired') and (
      new.name is distinct from old.name
      or new.subject_template is distinct from old.subject_template
      or new.body_template is distinct from old.body_template
      or new.yacht_id is distinct from old.yacht_id
      or new.version_number is distinct from old.version_number
    ) then
      raise exception 'Approved or retired template versions are immutable'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status
      and current_setting('app.template_transition_authorised', true) is distinct from 'yes'
    then
      raise exception 'Template status must be changed through the approval command'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_offer_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('app.offer_create_authorised', true) is distinct from 'yes' then
      raise exception 'Offers must be created through the draft command'
        using errcode = '42501';
    end if;
    if new.status <> 'draft' then
      raise exception 'Offers must start as drafts' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.reference is distinct from old.reference
    or new.enquiry_id is distinct from old.enquiry_id
    or new.yacht_id is distinct from old.yacht_id
    or new.template_version_id is distinct from old.template_version_id
    or new.rate_period_id is distinct from old.rate_period_id
    or new.source_offer_id is distinct from old.source_offer_id
    or new.version_number is distinct from old.version_number
    or new.charter_start_date is distinct from old.charter_start_date
    or new.charter_end_date is distinct from old.charter_end_date
    or new.charter_days is distinct from old.charter_days
    or new.weekly_rate_snapshot is distinct from old.weekly_rate_snapshot
    or new.currency is distinct from old.currency
    or new.tax_rate_snapshot is distinct from old.tax_rate_snapshot
    or new.short_charter_divisor_snapshot is distinct from old.short_charter_divisor_snapshot
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Offer source and version fields are immutable'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    and current_setting('app.offer_transition_authorised', true) is distinct from 'yes'
  then
    raise exception 'Offer status must be changed through an offer command'
      using errcode = '42501';
  end if;

  if (
    new.recipient_name is distinct from old.recipient_name
    or new.subject_snapshot is distinct from old.subject_snapshot
    or new.body_snapshot is distinct from old.body_snapshot
    or new.proposed_charter_fee is distinct from old.proposed_charter_fee
    or new.pricing_basis is distinct from old.pricing_basis
  ) and (
    old.status <> 'draft'
    or current_setting('app.offer_draft_update_authorised', true) is distinct from 'yes'
  ) then
    raise exception 'Only draft offer content can be changed through the draft command'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.record_offer_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_reason text;
  event_name text;
begin
  if tg_op = 'INSERT' then
    transition_reason := 'Offer draft created';
    event_name := 'OfferDraftCreated';
  elsif new.status is distinct from old.status then
    transition_reason := nullif(current_setting('app.offer_transition_reason', true), '');
    event_name := case new.status
      when 'approved' then 'OfferApproved'
      when 'sent' then 'OfferMarkedSent'
      when 'superseded' then 'OfferSuperseded'
      when 'withdrawn' then 'OfferWithdrawn'
      else 'OfferStatusChanged'
    end;
  else
    return new;
  end if;

  if transition_reason is null then
    raise exception 'A reason is required for every offer status transition'
      using errcode = '23514';
  end if;

  insert into public.offer_status_history (
    offer_id, from_status, to_status, reason, changed_by
  ) values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    transition_reason,
    (select auth.uid())
  );

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    event_name,
    'offer',
    new.id,
    (select auth.uid()),
    jsonb_build_object(
      'reference', new.reference,
      'enquiry_id', new.enquiry_id,
      'version_number', new.version_number,
      'from_status', case when tg_op = 'INSERT' then null else old.status end,
      'to_status', new.status,
      'reason', transition_reason
    )
  );

  return new;
end;
$$;

create or replace function public.approve_yacht_offer_template(p_template_id uuid)
returns public.yacht_offer_templates
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_template public.yacht_offer_templates;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  select * into target_template from public.yacht_offer_templates
  where id = p_template_id for update;
  if not found then
    raise exception 'Template not found or not accessible' using errcode = 'P0002';
  end if;
  if target_template.status <> 'draft' then
    raise exception 'Only a draft template can be approved' using errcode = '23514';
  end if;

  perform set_config('app.template_transition_authorised', 'yes', true);
  update public.yacht_offer_templates
  set status = 'retired'
  where yacht_id = target_template.yacht_id and status = 'approved';

  update public.yacht_offer_templates
  set status = 'approved', approved_by = (select auth.uid()), approved_at = now()
  where id = p_template_id returning * into target_template;
  perform set_config('app.template_transition_authorised', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'OfferTemplateApproved', 'yacht_offer_template', target_template.id,
    (select auth.uid()), jsonb_build_object(
      'yacht_id', target_template.yacht_id,
      'version_number', target_template.version_number
    )
  );
  return target_template;
end;
$$;

create or replace function public.create_offer_draft(
  p_enquiry_id uuid,
  p_template_version_id uuid,
  p_rate_period_id uuid,
  p_source_offer_id uuid,
  p_recipient_name text,
  p_subject_snapshot text,
  p_body_snapshot text,
  p_proposed_charter_fee numeric default null
)
returns public.offers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  enquiry_record public.enquiries;
  template_record public.yacht_offer_templates;
  rate_record public.yacht_rate_periods;
  profile_record public.yacht_commercial_profiles;
  created_offer public.offers;
  next_version integer;
  charter_length integer;
  suggested_fee numeric;
  clean_recipient text := nullif(trim(p_recipient_name), '');
  clean_subject text := nullif(trim(p_subject_snapshot), '');
  clean_body text := nullif(trim(p_body_snapshot), '');
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  select * into enquiry_record from public.enquiries
  where id = p_enquiry_id for update;
  if not found then raise exception 'Enquiry not found or not accessible' using errcode = 'P0002'; end if;
  if enquiry_record.requested_yacht_id is null
    or enquiry_record.charter_start_date is null
    or enquiry_record.charter_end_date is null
    or enquiry_record.charter_end_date <= enquiry_record.charter_start_date
  then
    raise exception 'An offer requires a yacht and valid charter dates' using errcode = '23514';
  end if;
  if enquiry_record.status not in ('new', 'waiting_for_reply', 'offer_sent', 'negotiating') then
    raise exception 'The enquiry state does not allow offer preparation' using errcode = '23514';
  end if;

  select * into template_record from public.yacht_offer_templates
  where id = p_template_version_id and status = 'approved';
  if not found or template_record.yacht_id <> enquiry_record.requested_yacht_id then
    raise exception 'An approved template for the requested yacht is required' using errcode = '23514';
  end if;

  select * into rate_record from public.yacht_rate_periods
  where id = p_rate_period_id and active = true;
  if not found or rate_record.yacht_id <> enquiry_record.requested_yacht_id
    or enquiry_record.charter_start_date < rate_record.valid_from
    or enquiry_record.charter_end_date > rate_record.valid_to
  then
    raise exception 'An active rate covering the complete charter is required' using errcode = '23514';
  end if;

  select * into profile_record from public.yacht_commercial_profiles
  where yacht_id = enquiry_record.requested_yacht_id;
  if not found then raise exception 'The yacht commercial profile is required' using errcode = '23514'; end if;

  if clean_recipient is null or char_length(clean_recipient) > 160
    or clean_subject is null or char_length(clean_subject) > 300
    or clean_body is null or char_length(clean_body) > 30000
  then
    raise exception 'Recipient, subject, or body is invalid' using errcode = '22023';
  end if;

  charter_length := enquiry_record.charter_end_date - enquiry_record.charter_start_date;
  suggested_fee := public.calculate_charter_fee(
    rate_record.weekly_rate, charter_length, profile_record.short_charter_divisor
  );
  if p_proposed_charter_fee is not null and p_proposed_charter_fee <= 0 then
    raise exception 'Proposed charter fee must be positive' using errcode = '22023';
  end if;

  perform set_config('app.offer_transition_authorised', 'yes', true);
  perform set_config('app.offer_transition_reason', 'Superseded by a newer offer draft', true);
  update public.offers set status = 'superseded'
  where enquiry_id = p_enquiry_id and status in ('draft', 'approved');
  perform set_config('app.offer_transition_authorised', '', true);
  perform set_config('app.offer_transition_reason', '', true);

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.offers where enquiry_id = p_enquiry_id;

  perform set_config('app.offer_create_authorised', 'yes', true);
  insert into public.offers (
    enquiry_id, yacht_id, template_version_id, rate_period_id, source_offer_id,
    version_number, recipient_name, subject_snapshot, body_snapshot,
    charter_start_date, charter_end_date, charter_days, weekly_rate_snapshot,
    proposed_charter_fee, currency, tax_rate_snapshot, short_charter_divisor_snapshot,
    pricing_basis
  ) values (
    p_enquiry_id, enquiry_record.requested_yacht_id, p_template_version_id,
    p_rate_period_id, p_source_offer_id, next_version, clean_recipient, clean_subject,
    clean_body, enquiry_record.charter_start_date, enquiry_record.charter_end_date,
    charter_length, rate_record.weekly_rate,
    coalesce(p_proposed_charter_fee, suggested_fee), rate_record.currency,
    rate_record.tax_rate, profile_record.short_charter_divisor,
    case
      when p_proposed_charter_fee is null or p_proposed_charter_fee = suggested_fee
        then 'seasonal_rate'::public.offer_pricing_basis
      else 'manually_adjusted'::public.offer_pricing_basis
    end
  ) returning * into created_offer;
  perform set_config('app.offer_create_authorised', '', true);
  return created_offer;
end;
$$;

create or replace function public.update_offer_draft(
  p_offer_id uuid,
  p_recipient_name text,
  p_subject_snapshot text,
  p_body_snapshot text,
  p_proposed_charter_fee numeric
)
returns public.offers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_offer public.offers;
  suggested_fee numeric;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if nullif(trim(p_recipient_name), '') is null or char_length(trim(p_recipient_name)) > 160
    or nullif(trim(p_subject_snapshot), '') is null or char_length(trim(p_subject_snapshot)) > 300
    or nullif(trim(p_body_snapshot), '') is null or char_length(trim(p_body_snapshot)) > 30000
    or p_proposed_charter_fee <= 0
  then
    raise exception 'Draft content is invalid' using errcode = '22023';
  end if;

  select public.calculate_charter_fee(
    weekly_rate_snapshot, charter_days, short_charter_divisor_snapshot
  ) into suggested_fee from public.offers where id = p_offer_id and status = 'draft';
  if not found then raise exception 'Editable offer draft not found' using errcode = 'P0002'; end if;

  perform set_config('app.offer_draft_update_authorised', 'yes', true);
  update public.offers set
    recipient_name = trim(p_recipient_name),
    subject_snapshot = trim(p_subject_snapshot),
    body_snapshot = trim(p_body_snapshot),
    proposed_charter_fee = p_proposed_charter_fee,
    pricing_basis = case
      when p_proposed_charter_fee = suggested_fee then 'seasonal_rate'::public.offer_pricing_basis
      else 'manually_adjusted'::public.offer_pricing_basis
    end
  where id = p_offer_id and status = 'draft'
  returning * into updated_offer;
  perform set_config('app.offer_draft_update_authorised', '', true);
  return updated_offer;
end;
$$;

create or replace function public.approve_offer(p_offer_id uuid, p_reason text)
returns public.offers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_offer public.offers;
  clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then
    raise exception 'An approval reason is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.offers candidate
    where candidate.id = p_offer_id and candidate.version_number <>
      (select max(latest.version_number) from public.offers latest where latest.enquiry_id = candidate.enquiry_id)
  ) then
    raise exception 'Only the latest offer version can be approved' using errcode = '23514';
  end if;
  perform set_config('app.offer_transition_authorised', 'yes', true);
  perform set_config('app.offer_transition_reason', clean_reason, true);
  update public.offers set status = 'approved', approved_by = (select auth.uid()), approved_at = now()
  where id = p_offer_id and status = 'draft' returning * into updated_offer;
  if not found then raise exception 'Approvable offer draft not found' using errcode = 'P0002'; end if;
  perform set_config('app.offer_transition_authorised', '', true);
  perform set_config('app.offer_transition_reason', '', true);
  return updated_offer;
end;
$$;

create or replace function public.mark_offer_sent(p_offer_id uuid, p_reason text)
returns public.offers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_offer public.offers;
  linked_enquiry public.enquiries;
  clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then
    raise exception 'A sent-record reason is required' using errcode = '22023';
  end if;

  perform set_config('app.offer_transition_authorised', 'yes', true);
  perform set_config('app.offer_transition_reason', clean_reason, true);
  update public.offers set status = 'sent', sent_by = (select auth.uid()), sent_at = now()
  where id = p_offer_id and status = 'approved' returning * into updated_offer;
  if not found then raise exception 'Approved offer not found' using errcode = 'P0002'; end if;
  perform set_config('app.offer_transition_authorised', '', true);
  perform set_config('app.offer_transition_reason', '', true);

  select * into linked_enquiry from public.enquiries
  where id = updated_offer.enquiry_id for update;
  if linked_enquiry.status in ('new', 'waiting_for_reply') then
    perform set_config('app.offer_sent_transition_authorised', 'yes', true);
    perform public.transition_enquiry_status(
      linked_enquiry.id,
      'offer_sent'::public.enquiry_status,
      'Offer ' || updated_offer.reference || ' recorded as sent: ' || clean_reason
    );
    perform set_config('app.offer_sent_transition_authorised', '', true);
  elsif linked_enquiry.status not in ('offer_sent', 'negotiating') then
    raise exception 'The enquiry state does not allow recording a sent offer'
      using errcode = '23514';
  end if;
  return updated_offer;
end;
$$;

-- Phase 4 used transaction-local command flags. Reset them before returning so a
-- caller cannot reuse the same transaction to perform a second direct status write.
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
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  clean_reason := nullif(trim(p_reason), '');
  if clean_reason is null or char_length(clean_reason) > 1000 then
    raise exception 'A transition reason between 2 and 1000 characters is required'
      using errcode = '22023';
  end if;
  if p_new_status = 'offer_sent'
    and current_setting('app.offer_sent_transition_authorised', true) is distinct from 'yes'
  then
    raise exception 'Offer sent state requires a human-recorded sent offer'
      using errcode = '42501';
  end if;

  perform set_config('app.enquiry_transition_authorised', 'yes', true);
  perform set_config('app.enquiry_transition_reason', clean_reason, true);
  update public.enquiries set status = p_new_status
  where id = p_enquiry_id returning * into updated_enquiry;
  if not found then
    raise exception 'Enquiry not found or not accessible' using errcode = 'P0002';
  end if;
  perform set_config('app.enquiry_transition_authorised', '', true);
  perform set_config('app.enquiry_transition_reason', '', true);
  return updated_enquiry;
end;
$$;

create trigger a_normalise_commercial_profile before insert or update on public.yacht_commercial_profiles
  for each row execute function public.normalise_commercial_record();
create trigger b_set_commercial_profile_audit before insert or update on public.yacht_commercial_profiles
  for each row execute function public.set_directory_audit_fields();
create trigger audit_commercial_profile after insert or update on public.yacht_commercial_profiles
  for each row execute function public.audit_directory_change('yacht_commercial_profile');

create trigger a_normalise_rate before insert or update on public.yacht_rate_periods
  for each row execute function public.normalise_commercial_record();
create trigger b_set_rate_audit before insert or update on public.yacht_rate_periods
  for each row execute function public.set_directory_audit_fields();
create trigger audit_rate after insert or update on public.yacht_rate_periods
  for each row execute function public.audit_directory_change('yacht_rate_period');

create trigger a_normalise_sales_material before insert or update on public.yacht_sales_materials
  for each row execute function public.normalise_commercial_record();
create trigger b_set_sales_material_audit before insert or update on public.yacht_sales_materials
  for each row execute function public.set_directory_audit_fields();
create trigger audit_sales_material after insert or update on public.yacht_sales_materials
  for each row execute function public.audit_directory_change('yacht_sales_material');

create trigger a_assign_template_version before insert on public.yacht_offer_templates
  for each row execute function public.assign_offer_template_version();
create trigger b_normalise_template before insert or update on public.yacht_offer_templates
  for each row execute function public.normalise_commercial_record();
create trigger c_validate_template before insert or update on public.yacht_offer_templates
  for each row execute function public.validate_offer_template_placeholders();
create trigger d_guard_template before insert or update on public.yacht_offer_templates
  for each row execute function public.guard_offer_template();
create trigger e_set_template_audit before insert or update on public.yacht_offer_templates
  for each row execute function public.set_directory_audit_fields();
create trigger audit_template after insert or update on public.yacht_offer_templates
  for each row execute function public.audit_directory_change('yacht_offer_template');

create trigger a_guard_offer before insert or update on public.offers
  for each row execute function public.guard_offer_mutation();
create trigger b_set_offer_audit before insert or update on public.offers
  for each row execute function public.set_directory_audit_fields();
create trigger audit_offer after insert or update on public.offers
  for each row execute function public.audit_directory_change('offer');
create trigger record_offer_lifecycle after insert or update on public.offers
  for each row execute function public.record_offer_lifecycle();

create policy "Active staff can view yacht commercial profiles" on public.yacht_commercial_profiles
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add yacht commercial profiles" on public.yacht_commercial_profiles
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update yacht commercial profiles" on public.yacht_commercial_profiles
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));

create policy "Active staff can view yacht rate periods" on public.yacht_rate_periods
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add yacht rate periods" on public.yacht_rate_periods
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update yacht rate periods" on public.yacht_rate_periods
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));

create policy "Active staff can view yacht sales materials" on public.yacht_sales_materials
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add yacht sales materials" on public.yacht_sales_materials
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update yacht sales materials" on public.yacht_sales_materials
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));

create policy "Active staff can view yacht offer templates" on public.yacht_offer_templates
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add yacht offer templates" on public.yacht_offer_templates
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update yacht offer templates" on public.yacht_offer_templates
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));

create policy "Active staff can view offers" on public.offers
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add offers" on public.offers
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update offers" on public.offers
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));
create policy "Active staff can view offer status history" on public.offer_status_history
  for select to authenticated using ((select public.is_active_staff()));

revoke all on public.yacht_commercial_profiles from anon, authenticated;
revoke all on public.yacht_rate_periods from anon, authenticated;
revoke all on public.yacht_sales_materials from anon, authenticated;
revoke all on public.yacht_offer_templates from anon, authenticated;
revoke all on public.offers from anon, authenticated;
revoke all on public.offer_status_history from anon, authenticated;
revoke all on sequence public.offer_reference_sequence from anon, authenticated;

grant select, insert, update on public.yacht_commercial_profiles to authenticated;
grant select, insert, update on public.yacht_rate_periods to authenticated;
grant select, insert, update on public.yacht_sales_materials to authenticated;
grant select, insert, update on public.yacht_offer_templates to authenticated;
grant select, insert, update on public.offers to authenticated;
grant select on public.offer_status_history to authenticated;
grant usage, select on sequence public.offer_reference_sequence to authenticated;

revoke all on function public.calculate_charter_fee(numeric, integer, numeric) from public, anon;
revoke all on function public.normalise_commercial_record() from public, anon, authenticated;
revoke all on function public.validate_offer_template_placeholders() from public, anon, authenticated;
revoke all on function public.assign_offer_template_version() from public, anon, authenticated;
revoke all on function public.guard_offer_template() from public, anon, authenticated;
revoke all on function public.guard_offer_mutation() from public, anon, authenticated;
revoke all on function public.record_offer_lifecycle() from public, anon, authenticated;
revoke all on function public.approve_yacht_offer_template(uuid) from public, anon;
revoke all on function public.create_offer_draft(uuid, uuid, uuid, uuid, text, text, text, numeric) from public, anon;
revoke all on function public.update_offer_draft(uuid, text, text, text, numeric) from public, anon;
revoke all on function public.approve_offer(uuid, text) from public, anon;
revoke all on function public.mark_offer_sent(uuid, text) from public, anon;

grant execute on function public.calculate_charter_fee(numeric, integer, numeric) to authenticated;
grant execute on function public.approve_yacht_offer_template(uuid) to authenticated;
grant execute on function public.create_offer_draft(uuid, uuid, uuid, uuid, text, text, text, numeric) to authenticated;
grant execute on function public.update_offer_draft(uuid, text, text, text, numeric) to authenticated;
grant execute on function public.approve_offer(uuid, text) to authenticated;
grant execute on function public.mark_offer_sent(uuid, text) to authenticated;
