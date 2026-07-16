-- Phase 11: notifications, calendar, invoice records, and controlled integration outbox.

create type public.integration_provider as enum (
  'telegram',
  'gmail',
  'google_calendar',
  'google_drive',
  'google_sheets'
);
create type public.integration_operation as enum (
  'telegram_send',
  'gmail_mark_read',
  'gmail_archive',
  'gmail_create_draft',
  'calendar_upsert',
  'drive_upload',
  'sheets_snapshot'
);
create type public.integration_delivery_status as enum (
  'pending',
  'claimed',
  'delivered',
  'failed',
  'cancelled'
);
create type public.notification_channel as enum ('in_app', 'telegram', 'email_draft');
create type public.notification_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.notification_status as enum (
  'pending_approval',
  'approved',
  'queued',
  'delivered',
  'failed',
  'cancelled'
);
create type public.calendar_event_kind as enum ('charter', 'payment', 'task');
create type public.calendar_event_status as enum ('active', 'cancelled');
create type public.calendar_sync_status as enum (
  'not_configured',
  'pending',
  'synced',
  'failed'
);
create type public.integration_snapshot_status as enum (
  'queued',
  'delivered',
  'failed',
  'cancelled'
);
create type public.invoice_profile_status as enum ('draft', 'approved', 'retired');

create table public.integration_connections (
  provider public.integration_provider primary key,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  enabled boolean not null default false,
  target_reference text check (
    target_reference is null or char_length(trim(target_reference)) between 1 and 500
  ),
  configuration_notes text check (
    configuration_notes is null or char_length(trim(configuration_notes)) between 2 and 2000
  ),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.integration_connections (provider, display_name) values
  ('telegram', 'Telegram notifications'),
  ('gmail', 'Gmail actions and drafts'),
  ('google_calendar', 'Google Calendar synchronisation'),
  ('google_drive', 'Google Drive controlled copies'),
  ('google_sheets', 'Google Sheets operational snapshot');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (
    idempotency_key ~ '^[a-z0-9][a-z0-9:_-]{4,239}$'
  ),
  notification_type text not null check (
    notification_type ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{1,79}$'),
  source_id uuid not null,
  recipient_user_id uuid references public.profiles (id) on delete restrict,
  recipient_contact_id uuid references public.contacts (id) on delete restrict,
  channel public.notification_channel not null,
  priority public.notification_priority not null default 'normal',
  title text not null check (char_length(trim(title)) between 2 and 240),
  body text not null check (char_length(trim(body)) between 2 and 30000),
  action_url text check (
    action_url is null
    or action_url ~ '^/[A-Za-z0-9/_?=&.-]+$'
      and char_length(action_url) <= 1001
  ),
  requires_approval boolean not null default true,
  status public.notification_status not null default 'pending_approval',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  approval_reason text check (
    approval_reason is null or char_length(trim(approval_reason)) between 2 and 2000
  ),
  delivered_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_one_recipient check (
    (recipient_user_id is not null)::integer +
    (recipient_contact_id is not null)::integer = 1
  ),
  constraint notifications_approval_fields check (
    (
      status = 'pending_approval'
      and approved_by is null
      and approved_at is null
      and approval_reason is null
    )
    or (
      status <> 'pending_approval'
      and (
        not requires_approval
        or approved_by is not null
          and approved_at is not null
          and approval_reason is not null
      )
    )
  )
);

create index notifications_status_priority_idx
  on public.notifications (status, priority, created_at);
create index notifications_user_idx
  on public.notifications (recipient_user_id, status, created_at desc);
create index notifications_contact_idx
  on public.notifications (recipient_contact_id, status, created_at desc);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('booking', 'payment', 'task')),
  source_id uuid not null,
  kind public.calendar_event_kind not null,
  title text not null check (char_length(trim(title)) between 2 and 240),
  description text check (
    description is null or char_length(trim(description)) between 2 and 5000
  ),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default true,
  timezone text not null default 'Europe/London' check (
    char_length(trim(timezone)) between 3 and 80
  ),
  status public.calendar_event_status not null default 'active',
  revision integer not null default 1 check (revision between 1 and 1000000),
  sync_status public.calendar_sync_status not null default 'not_configured',
  external_event_id text,
  external_url text check (external_url is null or external_url ~ '^https://'),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id, kind),
  constraint calendar_event_date_order check (end_at > start_at)
);

create index calendar_events_range_idx
  on public.calendar_events (start_at, end_at) where status = 'active';
create index calendar_events_sync_idx
  on public.calendar_events (sync_status, updated_at)
  where status = 'active' and sync_status in ('pending', 'failed');

create table public.integration_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null check (snapshot_type = 'operations_workbook'),
  payload jsonb not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  row_count integer not null check (row_count >= 0),
  status public.integration_snapshot_status not null default 'queued',
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (snapshot_type, payload_sha256)
);

create table public.invoice_profiles (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null check (version_number > 0),
  status public.invoice_profile_status not null default 'draft',
  profile_name text not null check (char_length(trim(profile_name)) between 2 and 120),
  issuer_name text not null check (char_length(trim(issuer_name)) between 2 and 200),
  issuer_address text not null check (char_length(trim(issuer_address)) between 2 and 2000),
  recipient_name text not null check (char_length(trim(recipient_name)) between 2 and 200),
  recipient_address text not null check (char_length(trim(recipient_address)) between 2 and 2000),
  recipient_email text check (
    recipient_email is null or recipient_email = lower(recipient_email)
      and char_length(recipient_email) <= 320
  ),
  service_description_template text not null check (
    char_length(trim(service_description_template)) between 2 and 1000
  ),
  payment_instructions text not null check (
    char_length(trim(payment_instructions)) between 2 and 5000
  ),
  source_profile_id uuid references public.invoice_profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_name, version_number),
  constraint invoice_profile_approval_fields check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  )
);

create unique index one_approved_invoice_profile_idx
  on public.invoice_profiles ((status)) where status = 'approved';

create table public.generated_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  commission_calculation_id uuid not null
    references public.commission_calculations (id) on delete restrict,
  invoice_profile_id uuid not null references public.invoice_profiles (id) on delete restrict,
  document_id uuid not null references public.documents (id) on delete restrict,
  invoice_number text not null unique check (
    invoice_number ~ '^[A-Z0-9][A-Z0-9./_-]{2,79}$'
  ),
  issue_date date not null,
  service_description text not null check (
    char_length(trim(service_description)) between 2 and 1000
  ),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  generated_by uuid references public.profiles (id) on delete set null,
  generated_at timestamptz not null default now(),
  unique (booking_id, commission_calculation_id, invoice_profile_id)
);

create table public.integration_deliveries (
  id uuid primary key default gen_random_uuid(),
  provider public.integration_provider not null,
  operation public.integration_operation not null,
  idempotency_key text not null unique check (
    idempotency_key ~ '^[a-z0-9][a-z0-9:_-]{4,239}$'
  ),
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{1,79}$'),
  source_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status public.integration_delivery_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  next_attempt_at timestamptz not null default now(),
  claimed_by text check (claimed_by is null or char_length(claimed_by) between 2 and 160),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  external_id text check (external_id is null or char_length(external_id) <= 1000),
  external_url text check (
    external_url is null or external_url ~ '^https?://'
  ),
  last_error_code text check (
    last_error_code is null or char_length(last_error_code) <= 120
  ),
  last_error_message text check (
    last_error_message is null or char_length(last_error_message) <= 2000
  ),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_delivery_claim_fields check (
    (status = 'claimed' and claimed_by is not null and claimed_at is not null
      and lease_expires_at is not null)
    or status <> 'claimed'
  ),
  constraint integration_delivery_success_fields check (
    (status = 'delivered' and delivered_at is not null)
    or status <> 'delivered'
  )
);

create index integration_deliveries_work_idx
  on public.integration_deliveries (status, next_attempt_at, created_at)
  where status in ('pending', 'failed', 'claimed');
create index integration_deliveries_source_idx
  on public.integration_deliveries (source_type, source_id, created_at desc);

create or replace function public.guard_phase11_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.phase11_command', true), '') <> 'yes' then
    raise exception 'Use an approved Phase 11 command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_integration_connections
  before insert or update or delete on public.integration_connections
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_notifications
  before insert or update or delete on public.notifications
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_calendar_events
  before insert or update or delete on public.calendar_events
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_integration_snapshots
  before insert or update or delete on public.integration_snapshots
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_invoice_profiles
  before insert or update or delete on public.invoice_profiles
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_generated_invoices
  before insert or update or delete on public.generated_invoices
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_integration_deliveries
  before insert or update or delete on public.integration_deliveries
  for each row execute function public.guard_phase11_direct_mutation();

create or replace function public.update_integration_connection(
  p_provider public.integration_provider,
  p_enabled boolean,
  p_target_reference text,
  p_configuration_notes text
)
returns public.integration_connections
language plpgsql security definer set search_path = '' as $$
declare updated_record public.integration_connections;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.integration_connections
  set enabled = p_enabled,
      target_reference = nullif(trim(p_target_reference), ''),
      configuration_notes = nullif(trim(p_configuration_notes), ''),
      updated_by = (select auth.uid()),
      updated_at = now()
  where provider = p_provider
  returning * into updated_record;
  perform set_config('app.phase11_command', '', true);
  return updated_record;
end;
$$;

create or replace function public.queue_notification_delivery(p_notification_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  notification_record public.notifications;
  delivery_id uuid;
  selected_provider public.integration_provider;
  selected_operation public.integration_operation;
  recipient_reference text;
begin
  select * into notification_record
  from public.notifications where id = p_notification_id for update;
  if not found then raise exception 'Notification not found' using errcode = 'P0002'; end if;

  if notification_record.channel = 'in_app' then
    perform set_config('app.phase11_command', 'yes', true);
    update public.notifications
    set status = 'delivered', delivered_at = now(), updated_at = now()
    where id = p_notification_id;
    perform set_config('app.phase11_command', '', true);
    return null;
  elsif notification_record.channel = 'telegram' then
    selected_provider := 'telegram';
    selected_operation := 'telegram_send';
    if notification_record.recipient_user_id is not null then
      select telegram_chat_id into recipient_reference
      from public.profiles
      where id = notification_record.recipient_user_id and active;
    else
      raise exception 'Telegram delivery is restricted to internal users'
        using errcode = '23514';
    end if;
  else
    selected_provider := 'gmail';
    selected_operation := 'gmail_create_draft';
    if notification_record.recipient_contact_id is not null then
      select email into recipient_reference
      from public.contacts
      where id = notification_record.recipient_contact_id and active;
    else
      select email into recipient_reference
      from public.profiles
      where id = notification_record.recipient_user_id and active;
    end if;
  end if;

  if recipient_reference is null then
    raise exception 'The selected recipient has no configured delivery address'
      using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.integration_connections
    where provider = selected_provider and enabled
  ) then
    raise exception 'The selected integration is not enabled' using errcode = '23514';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  ) values (
    selected_provider,
    selected_operation,
    'notification:' || notification_record.id::text,
    'notification',
    notification_record.id,
    jsonb_build_object(
      'recipient', recipient_reference,
      'title', notification_record.title,
      'body', notification_record.body,
      'action_url', notification_record.action_url,
      'priority', notification_record.priority
    )
  )
  on conflict (idempotency_key) do update
    set payload = excluded.payload, updated_at = now()
    where public.integration_deliveries.status in ('pending', 'failed')
  returning id into delivery_id;
  update public.notifications set status = 'queued', updated_at = now()
  where id = notification_record.id;
  perform set_config('app.phase11_command', '', true);
  return delivery_id;
end;
$$;

create or replace function public.create_notification(
  p_idempotency_key text,
  p_notification_type text,
  p_source_type text,
  p_source_id uuid,
  p_recipient_user_id uuid,
  p_recipient_contact_id uuid,
  p_channel public.notification_channel,
  p_priority public.notification_priority,
  p_title text,
  p_body text,
  p_action_url text,
  p_requires_approval boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare notification_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_recipient_user_id is not null and not exists (
    select 1 from public.profiles where id = p_recipient_user_id and active
  ) then
    raise exception 'Active internal recipient not found' using errcode = '23514';
  end if;
  if p_recipient_contact_id is not null and not exists (
    select 1 from public.contacts where id = p_recipient_contact_id and active
  ) then
    raise exception 'Active contact recipient not found' using errcode = '23514';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  insert into public.notifications (
    idempotency_key, notification_type, source_type, source_id,
    recipient_user_id, recipient_contact_id, channel, priority,
    title, body, action_url, requires_approval, status,
    approved_by, approved_at, approval_reason, created_by
  ) values (
    lower(trim(p_idempotency_key)), lower(trim(p_notification_type)),
    lower(trim(p_source_type)), p_source_id, p_recipient_user_id,
    p_recipient_contact_id, p_channel, p_priority, trim(p_title), trim(p_body),
    nullif(trim(p_action_url), ''), p_requires_approval,
    case when p_requires_approval then 'pending_approval'::public.notification_status
      else 'approved'::public.notification_status end,
    case when p_requires_approval then null else (select auth.uid()) end,
    case when p_requires_approval then null else now() end,
    case when p_requires_approval then null else 'System-safe internal notification' end,
    (select auth.uid())
  )
  on conflict (idempotency_key) do update
    set title = excluded.title,
        body = excluded.body,
        action_url = excluded.action_url,
        updated_at = now()
    where public.notifications.status = 'pending_approval'
  returning id into notification_id;
  perform set_config('app.phase11_command', '', true);

  if not p_requires_approval then
    perform public.queue_notification_delivery(notification_id);
  end if;
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'NotificationCreated', 'notification', notification_id, (select auth.uid()),
    jsonb_build_object('channel', p_channel, 'requires_approval', p_requires_approval)
  );
  return notification_id;
end;
$$;

create or replace function public.review_notification(
  p_notification_id uuid,
  p_approved boolean,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A review reason is required' using errcode = '22023';
  end if;
  perform 1 from public.notifications
  where id = p_notification_id and status = 'pending_approval' for update;
  if not found then
    raise exception 'Pending notification not found' using errcode = 'P0002';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  update public.notifications
  set status = case when p_approved then 'approved'::public.notification_status
      else 'cancelled'::public.notification_status end,
      approved_by = (select auth.uid()),
      approved_at = now(),
      approval_reason = trim(p_reason),
      updated_at = now()
  where id = p_notification_id;
  perform set_config('app.phase11_command', '', true);

  if p_approved then perform public.queue_notification_delivery(p_notification_id); end if;
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    case when p_approved then 'NotificationApproved' else 'NotificationCancelled' end,
    'notification', p_notification_id, (select auth.uid()),
    jsonb_build_object('reason', trim(p_reason))
  );
end;
$$;

create or replace function public.refresh_operational_calendar()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  changed_count integer := 0;
  calendar_enabled boolean;
begin
  calendar_enabled := exists (
    select 1 from public.integration_connections
    where provider = 'google_calendar' and enabled
  );
  perform set_config('app.phase11_command', 'yes', true);

  with source_rows as (
    select
      'booking'::text source_type,
      b.id source_id,
      'charter'::public.calendar_event_kind kind,
      b.reference || ' · ' || y.name || ' charter' title,
      'Authoritative booking dates. No attendees are added automatically.' description,
      b.charter_start_date::timestamp at time zone 'Europe/London' start_at,
      (b.charter_end_date + 1)::timestamp at time zone 'Europe/London' end_at,
      case when b.status = 'cancelled' then 'cancelled'::public.calendar_event_status
        else 'active'::public.calendar_event_status end status
    from public.bookings b join public.yachts y on y.id = b.yacht_id
    union all
    select
      'payment', p.id, 'payment'::public.calendar_event_kind,
      b.reference || ' · instalment ' || p.instalment_number || ' due',
      p.currency || ' ' || to_char(p.amount, 'FM999999999990.00'),
      p.due_date::timestamp at time zone 'Europe/London',
      (p.due_date + 1)::timestamp at time zone 'Europe/London',
      case when p.status = 'cancelled' then 'cancelled'::public.calendar_event_status
        else 'active'::public.calendar_event_status end
    from public.payment_schedules p join public.bookings b on b.id = p.booking_id
    union all
    select
      'task', t.id, 'task'::public.calendar_event_kind,
      coalesce(t.step_code || ' · ', '') || t.title,
      t.reference || ' · ' || b.reference,
      t.due_date::timestamp at time zone 'Europe/London',
      (t.due_date + 1)::timestamp at time zone 'Europe/London',
      case when t.status = 'cancelled' then 'cancelled'::public.calendar_event_status
        else 'active'::public.calendar_event_status end
    from public.tasks t join public.bookings b on b.id = t.booking_id
    where t.due_date is not null
  ),
  upserted as (
    insert into public.calendar_events (
      source_type, source_id, kind, title, description, start_at, end_at,
      status, sync_status
    )
    select
      source_type, source_id, kind, title, description, start_at, end_at,
      status,
      case when calendar_enabled then 'pending'::public.calendar_sync_status
        else 'not_configured'::public.calendar_sync_status end
    from source_rows
    on conflict (source_type, source_id, kind) do update
    set title = excluded.title,
        description = excluded.description,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        status = excluded.status,
        revision = case
          when public.calendar_events.title is distinct from excluded.title
            or public.calendar_events.description is distinct from excluded.description
            or public.calendar_events.start_at is distinct from excluded.start_at
            or public.calendar_events.end_at is distinct from excluded.end_at
            or public.calendar_events.status is distinct from excluded.status
          then public.calendar_events.revision + 1
          else public.calendar_events.revision
        end,
        sync_status = case
          when calendar_enabled and (
            public.calendar_events.title is distinct from excluded.title
            or public.calendar_events.description is distinct from excluded.description
            or public.calendar_events.start_at is distinct from excluded.start_at
            or public.calendar_events.end_at is distinct from excluded.end_at
            or public.calendar_events.status is distinct from excluded.status
          ) then 'pending'::public.calendar_sync_status
          when not calendar_enabled then 'not_configured'::public.calendar_sync_status
          else public.calendar_events.sync_status
        end,
        updated_at = now()
    returning *
  )
  select count(*) into changed_count from upserted;

  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  )
  select
    'google_calendar',
    'calendar_upsert',
    'calendar:' || event.id::text || ':r' || event.revision,
    'calendar_event',
    event.id,
    jsonb_build_object(
      'event_id', replace(event.id::text, '-', ''),
      'title', event.title,
      'description', event.description,
      'start', event.start_at,
      'end', event.end_at,
      'all_day', event.all_day,
      'timezone', event.timezone,
      'status', event.status,
      'visibility', 'private',
      'send_updates', 'none'
    )
  from public.calendar_events event
  where calendar_enabled
    and event.sync_status in ('pending', 'failed')
  on conflict (idempotency_key) do nothing;
  perform set_config('app.phase11_command', '', true);
  return changed_count;
end;
$$;

create or replace function public.queue_email_provider_actions()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued_count integer;
begin
  if not exists (
    select 1 from public.integration_connections where provider = 'gmail' and enabled
  ) then return 0; end if;
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  )
  select
    'gmail',
    case action.action_type
      when 'mark_read' then 'gmail_mark_read'::public.integration_operation
      else 'gmail_archive'::public.integration_operation
    end,
    'email_action:' || action.id::text,
    'email_provider_action',
    action.id,
    jsonb_build_object(
      'provider_message_id', message.provider_message_id,
      'action_type', action.action_type
    )
  from public.email_provider_actions action
  join public.email_messages message on message.id = action.message_id
  where action.status in ('pending', 'failed')
  on conflict (idempotency_key) do nothing;
  get diagnostics queued_count = row_count;
  perform set_config('app.phase11_command', '', true);
  return queued_count;
end;
$$;

create or replace function public.materialise_operational_notifications(p_as_of timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare
  default_user uuid;
  created_count integer := 0;
  inserted_count integer := 0;
  telegram_enabled boolean;
begin
  select id into default_user from public.profiles
  where active order by (role = 'administrator') desc, created_at limit 1;
  if default_user is null then return 0; end if;
  telegram_enabled := exists (
    select 1 from public.integration_connections
    where provider = 'telegram' and enabled
  );
  perform set_config('app.phase11_command', 'yes', true);

  insert into public.notifications (
    idempotency_key, notification_type, source_type, source_id,
    recipient_user_id, channel, priority, title, body, action_url,
    requires_approval, status, approved_by, approved_at, approval_reason
  )
  select
    'email_received:' || message.id::text,
    'email_received',
    'email_message',
    message.id,
    default_user,
    case when telegram_enabled then 'telegram'::public.notification_channel
      else 'in_app'::public.notification_channel end,
    case when message.classification = 'unclassified'
      then 'high'::public.notification_priority
      else 'normal'::public.notification_priority end,
    case message.classification
      when 'new_enquiry' then 'New charter enquiry'
      when 'enquiry_follow_up' then 'Enquiry follow-up received'
      when 'internal' then 'Internal email received'
      when 'other_relevant' then 'Relevant email received'
      else 'Email requires review'
    end,
    'From ' || message.sender_email || E'\n\n' || message.subject ||
      case when message.snippet <> '' then E'\n\n' || message.snippet else '' end,
    '/emails/' || message.id::text,
    false,
    'approved',
    default_user,
    now(),
    'Deterministic internal alert'
  from public.email_messages message
  where message.classification <> 'circular'
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key, notification_type, source_type, source_id,
    recipient_user_id, channel, priority, title, body, action_url,
    requires_approval, status, approved_by, approved_at, approval_reason
  )
  select
    'task_due:' || task.id::text || ':' || task.due_date::text,
    'task_due',
    'task',
    task.id,
    coalesce(task.assigned_user_id, default_user),
    case when telegram_enabled then 'telegram'::public.notification_channel
      else 'in_app'::public.notification_channel end,
    case when task.due_date < p_as_of::date then 'urgent'::public.notification_priority
      when task.priority in ('high', 'urgent') then task.priority::text::public.notification_priority
      else 'normal'::public.notification_priority end,
    case when task.due_date < p_as_of::date then 'Overdue task' else 'Task due' end ||
      coalesce(' · ' || task.step_code, ''),
    task.title || E'\n\nBooking ' || booking.reference || ' · ' || yacht.name ||
      E'\nDue ' || task.due_date::text,
    '/tasks/' || task.id::text,
    false,
    'approved',
    coalesce(task.assigned_user_id, default_user),
    now(),
    'Deterministic task reminder'
  from public.tasks task
  join public.bookings booking on booking.id = task.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  where task.status = 'ready'
    and task.due_date is not null
    and task.due_date <= p_as_of::date + coalesce(task.reminder_lead_days, 0)
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key, notification_type, source_type, source_id,
    recipient_user_id, channel, priority, title, body, action_url,
    requires_approval, status, approved_by, approved_at, approval_reason
  )
  select
    'payment_due:' || payment.id::text || ':' || payment.due_date::text,
    'payment_due',
    'payment',
    payment.id,
    default_user,
    case when telegram_enabled then 'telegram'::public.notification_channel
      else 'in_app'::public.notification_channel end,
    case when payment.due_date < p_as_of::date then 'urgent'::public.notification_priority
      else 'high'::public.notification_priority end,
    'Charter instalment ' || payment.instalment_number ||
      case when payment.due_date < p_as_of::date then ' overdue' else ' due' end,
    booking.reference || ' · ' || yacht.name || E'\n' ||
      payment.currency || ' ' || to_char(payment.amount, 'FM999999999990.00') ||
      E'\nDue ' || payment.due_date::text ||
      E'\nCharter ' || booking.charter_start_date::text || ' to ' ||
      booking.charter_end_date::text ||
      case when broker.email is not null then E'\nBroker ' || broker.email else '' end,
    '/bookings/' || booking.id::text || '/documents',
    false,
    'approved',
    default_user,
    now(),
    'Deterministic payment reminder'
  from public.payment_schedules payment
  join public.bookings booking on booking.id = payment.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  left join public.contacts broker on broker.id = booking.broker_contact_id
  where payment.status = 'scheduled' and payment.due_date <= p_as_of::date + 7
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  perform set_config('app.phase11_command', '', true);

  perform public.queue_notification_delivery(notification.id)
  from public.notifications notification
  where notification.status = 'approved'
    and notification.requires_approval = false
    and not exists (
      select 1 from public.integration_deliveries delivery
      where delivery.source_type = 'notification'
        and delivery.source_id = notification.id
    );
  return created_count;
end;
$$;

create or replace function public.queue_operations_sheet_snapshot()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  snapshot_payload jsonb;
  snapshot_hash text;
  snapshot_id uuid;
  rows_total integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.integration_connections
    where provider = 'google_sheets' and enabled
  ) then
    raise exception 'Google Sheets is not enabled' using errcode = '23514';
  end if;
  snapshot_payload := jsonb_build_object(
    'generated_at', now(),
    'enquiries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'reference', enquiry.reference,
        'status', enquiry.status,
        'priority', enquiry.priority,
        'summary', enquiry.summary,
        'yacht', yacht.name,
        'start_date', enquiry.charter_start_date,
        'end_date', enquiry.charter_end_date,
        'updated_at', enquiry.updated_at
      ) order by enquiry.updated_at desc), '[]'::jsonb)
      from public.enquiries enquiry
      left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
    ),
    'bookings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'reference', booking.reference,
        'status', booking.status,
        'yacht', yacht.name,
        'start_date', booking.charter_start_date,
        'end_date', booking.charter_end_date,
        'currency', booking.currency,
        'charter_fee', booking.charter_fee
      ) order by booking.charter_start_date), '[]'::jsonb)
      from public.bookings booking join public.yachts yacht on yacht.id = booking.yacht_id
    ),
    'captains', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'yacht', yacht.name,
        'captain', contact.full_name,
        'email', contact.email,
        'phone', contact.phone
      ) order by yacht.name), '[]'::jsonb)
      from public.yacht_contacts assignment
      join public.yachts yacht on yacht.id = assignment.yacht_id
      join public.contacts contact on contact.id = assignment.contact_id
      where assignment.responsibility = 'captain' and assignment.is_primary
    )
  );
  rows_total := jsonb_array_length(snapshot_payload->'enquiries') +
    jsonb_array_length(snapshot_payload->'bookings') +
    jsonb_array_length(snapshot_payload->'captains');
  snapshot_hash := encode(extensions.digest(snapshot_payload::text, 'sha256'), 'hex');
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_snapshots (
    snapshot_type, payload, payload_sha256, row_count, requested_by
  ) values (
    'operations_workbook', snapshot_payload, snapshot_hash, rows_total, (select auth.uid())
  )
  on conflict (snapshot_type, payload_sha256) do update
    set requested_at = now(), requested_by = (select auth.uid())
  returning id into snapshot_id;
  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  ) values (
    'google_sheets', 'sheets_snapshot', 'sheet_snapshot:' || snapshot_id::text,
    'integration_snapshot', snapshot_id, snapshot_payload
  ) on conflict (idempotency_key) do nothing;
  perform set_config('app.phase11_command', '', true);
  return snapshot_id;
end;
$$;

create or replace function public.queue_document_drive_sync(
  p_document_id uuid,
  p_reason text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare document_record public.documents; delivery_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A sync reason is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.integration_connections
    where provider = 'google_drive' and enabled
  ) then raise exception 'Google Drive is not enabled' using errcode = '23514'; end if;
  select * into document_record from public.documents
  where id = p_document_id and verification_status = 'verified';
  if not found then
    raise exception 'Only a verified document can be copied to Drive'
      using errcode = '23514';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  ) values (
    'google_drive', 'drive_upload',
    'drive_document:' || document_record.id::text || ':v' || document_record.version_number,
    'document', document_record.id,
    jsonb_build_object(
      'document_id', document_record.id,
      'filename', document_record.original_filename,
      'mime_type', document_record.mime_type,
      'booking_id', document_record.booking_id,
      'reason', trim(p_reason)
    )
  )
  on conflict (idempotency_key) do update
    set status = case when public.integration_deliveries.status = 'failed'
      then 'pending'::public.integration_delivery_status
      else public.integration_deliveries.status end,
      next_attempt_at = now(),
      last_error_code = null,
      last_error_message = null,
      updated_at = now()
  returning id into delivery_id;
  perform set_config('app.phase11_command', '', true);
  return delivery_id;
end;
$$;

create or replace function public.create_invoice_profile_draft(
  p_profile_name text,
  p_issuer_name text,
  p_issuer_address text,
  p_recipient_name text,
  p_recipient_address text,
  p_recipient_email text,
  p_service_description_template text,
  p_payment_instructions text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare profile_id uuid; next_version integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.invoice_profiles where lower(profile_name) = lower(trim(p_profile_name));
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.invoice_profiles (
    version_number, profile_name, issuer_name, issuer_address, recipient_name,
    recipient_address, recipient_email, service_description_template,
    payment_instructions, created_by
  ) values (
    next_version, trim(p_profile_name), trim(p_issuer_name), trim(p_issuer_address),
    trim(p_recipient_name), trim(p_recipient_address),
    nullif(lower(trim(p_recipient_email)), ''),
    trim(p_service_description_template), trim(p_payment_instructions),
    (select auth.uid())
  ) returning id into profile_id;
  perform set_config('app.phase11_command', '', true);
  return profile_id;
end;
$$;

create or replace function public.approve_invoice_profile(
  p_profile_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'An approval reason is required' using errcode = '22023';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.invoice_profiles set status = 'retired', updated_at = now()
  where status = 'approved' and id <> p_profile_id;
  update public.invoice_profiles
  set status = 'approved', approved_by = (select auth.uid()), approved_at = now(),
      updated_at = now()
  where id = p_profile_id and status = 'draft';
  if not found then raise exception 'Draft invoice profile not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InvoiceProfileApproved', 'invoice_profile', p_profile_id, (select auth.uid()),
    jsonb_build_object('reason', trim(p_reason))
  );
end;
$$;

create or replace function public.register_generated_invoice(
  p_booking_id uuid,
  p_commission_calculation_id uuid,
  p_invoice_profile_id uuid,
  p_document_id uuid,
  p_invoice_number text,
  p_issue_date date,
  p_service_description text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation public.commission_calculations; invoice_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  select * into calculation from public.commission_calculations
  where id = p_commission_calculation_id and booking_id = p_booking_id;
  if not found then raise exception 'Commission calculation not found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.invoice_profiles
    where id = p_invoice_profile_id and status = 'approved'
  ) then raise exception 'An approved invoice profile is required' using errcode = '23514'; end if;
  if not exists (
    select 1 from public.documents
    where id = p_document_id and booking_id = p_booking_id
      and document_type = 'kylian_commission_invoice'
  ) then raise exception 'Registered invoice document not found' using errcode = '23514'; end if;
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.generated_invoices (
    booking_id, commission_calculation_id, invoice_profile_id, document_id,
    invoice_number, issue_date, service_description, amount, currency, generated_by
  ) values (
    p_booking_id, p_commission_calculation_id, p_invoice_profile_id, p_document_id,
    upper(trim(p_invoice_number)), p_issue_date, trim(p_service_description),
    calculation.amount, calculation.currency, (select auth.uid())
  ) returning id into invoice_id;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InvoiceGenerated', 'generated_invoice', invoice_id, (select auth.uid()),
    jsonb_build_object('booking_id', p_booking_id, 'document_id', p_document_id)
  );
  return invoice_id;
end;
$$;

create or replace function public.claim_integration_deliveries(
  p_worker_id text,
  p_limit integer default 20
)
returns setof public.integration_deliveries
language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  if char_length(trim(p_worker_id)) < 2 or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid claim parameters' using errcode = '22023';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  return query
  with claimable as (
    select id from public.integration_deliveries
    where (
      status in ('pending', 'failed') and next_attempt_at <= now()
      or status = 'claimed' and lease_expires_at <= now()
    )
    order by next_attempt_at, created_at
    for update skip locked
    limit p_limit
  )
  update public.integration_deliveries delivery
  set status = 'claimed',
      attempt_count = delivery.attempt_count + 1,
      claimed_by = trim(p_worker_id),
      claimed_at = now(),
      lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
  from claimable
  where delivery.id = claimable.id
  returning delivery.*;
  perform set_config('app.phase11_command', '', true);
end;
$$;

create or replace function public.complete_integration_delivery(
  p_delivery_id uuid,
  p_worker_id text,
  p_external_id text,
  p_external_url text
)
returns void language plpgsql security definer set search_path = '' as $$
declare delivery_record public.integration_deliveries;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  select * into delivery_record from public.integration_deliveries
  where id = p_delivery_id and status = 'claimed'
    and claimed_by = trim(p_worker_id) and lease_expires_at > now()
  for update;
  if not found then raise exception 'Active delivery claim not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.integration_deliveries
  set status = 'delivered', external_id = nullif(trim(p_external_id), ''),
      external_url = nullif(trim(p_external_url), ''), delivered_at = now(),
      claimed_by = null, claimed_at = null, lease_expires_at = null,
      last_error_code = null, last_error_message = null, updated_at = now()
  where id = p_delivery_id;
  update public.integration_connections
  set last_success_at = now(), last_error = null, updated_at = now()
  where provider = delivery_record.provider;

  if delivery_record.source_type = 'notification' then
    update public.notifications
    set status = 'delivered', delivered_at = now(), updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'email_provider_action' then
    perform set_config('app.phase9_command', 'yes', true);
    update public.email_provider_actions
    set status = 'completed', completed_at = now(), last_error = null,
        updated_at = now()
    where id = delivery_record.source_id;
    perform set_config('app.phase9_command', '', true);
  elsif delivery_record.source_type = 'calendar_event' then
    update public.calendar_events
    set sync_status = 'synced', external_event_id = nullif(trim(p_external_id), ''),
        external_url = nullif(trim(p_external_url), ''), last_synced_at = now(),
        updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'integration_snapshot' then
    update public.integration_snapshots
    set status = 'delivered', delivered_at = now()
    where id = delivery_record.source_id;
  end if;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, payload
  ) values (
    'IntegrationDeliveryCompleted', 'integration_delivery', p_delivery_id,
    jsonb_build_object('provider', delivery_record.provider, 'operation', delivery_record.operation)
  );
end;
$$;

create or replace function public.fail_integration_delivery(
  p_delivery_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare delivery_record public.integration_deliveries; retry_at timestamptz;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  select * into delivery_record from public.integration_deliveries
  where id = p_delivery_id and status = 'claimed' and claimed_by = trim(p_worker_id)
  for update;
  if not found then raise exception 'Active delivery claim not found' using errcode = 'P0002'; end if;
  retry_at := case when p_retryable and delivery_record.attempt_count < 8
    then now() + make_interval(mins => least(60, power(2, delivery_record.attempt_count)::integer))
    else 'infinity'::timestamptz end;
  perform set_config('app.phase11_command', 'yes', true);
  update public.integration_deliveries
  set status = 'failed',
      next_attempt_at = retry_at,
      claimed_by = null, claimed_at = null, lease_expires_at = null,
      last_error_code = left(trim(p_error_code), 120),
      last_error_message = left(trim(p_error_message), 2000),
      updated_at = now()
  where id = p_delivery_id;
  update public.integration_connections
  set last_failure_at = now(), last_error = left(trim(p_error_message), 2000),
      updated_at = now()
  where provider = delivery_record.provider;
  if delivery_record.source_type = 'notification' then
    update public.notifications set status = 'failed', updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'email_provider_action' then
    perform set_config('app.phase9_command', 'yes', true);
    update public.email_provider_actions
    set status = 'failed', attempt_count = attempt_count + 1,
        last_error = left(trim(p_error_message), 2000), updated_at = now()
    where id = delivery_record.source_id;
    perform set_config('app.phase9_command', '', true);
  elsif delivery_record.source_type = 'calendar_event' then
    update public.calendar_events set sync_status = 'failed', updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'integration_snapshot' then
    update public.integration_snapshots set status = 'failed'
    where id = delivery_record.source_id;
  end if;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, payload
  ) values (
    'IntegrationDeliveryFailed', 'integration_delivery', p_delivery_id,
    jsonb_build_object(
      'provider', delivery_record.provider,
      'operation', delivery_record.operation,
      'retryable', p_retryable,
      'error_code', left(trim(p_error_code), 120)
    )
  );
end;
$$;

create or replace function public.retry_integration_delivery(
  p_delivery_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A retry reason is required' using errcode = '22023';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.integration_deliveries
  set status = 'pending', next_attempt_at = now(), claimed_by = null,
      claimed_at = null, lease_expires_at = null, last_error_code = null,
      last_error_message = null, updated_at = now()
  where id = p_delivery_id and status = 'failed';
  if not found then raise exception 'Failed delivery not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'IntegrationDeliveryRetried', 'integration_delivery', p_delivery_id,
    (select auth.uid()), jsonb_build_object('reason', trim(p_reason))
  );
end;
$$;

create or replace function public.run_automation_tick(p_as_of timestamptz default now())
returns jsonb language plpgsql security definer set search_path = '' as $$
declare notification_count integer; email_action_count integer; calendar_count integer;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  notification_count := public.materialise_operational_notifications(p_as_of);
  email_action_count := public.queue_email_provider_actions();
  calendar_count := public.refresh_operational_calendar();
  return jsonb_build_object(
    'notifications_created', notification_count,
    'email_actions_queued', email_action_count,
    'calendar_records_refreshed', calendar_count
  );
end;
$$;

alter table public.integration_connections enable row level security;
alter table public.notifications enable row level security;
alter table public.calendar_events enable row level security;
alter table public.integration_snapshots enable row level security;
alter table public.invoice_profiles enable row level security;
alter table public.generated_invoices enable row level security;
alter table public.integration_deliveries enable row level security;

create policy "active staff read integration connections" on public.integration_connections
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read notifications" on public.notifications
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read calendar" on public.calendar_events
  for select to authenticated using ((select public.is_active_staff()));
create policy "administrators read snapshots" on public.integration_snapshots
  for select to authenticated using ((select public.is_administrator()));
create policy "active staff read approved invoice profiles" on public.invoice_profiles
  for select to authenticated using (
    (select public.is_active_staff())
    and (status = 'approved' or (select public.is_administrator()))
  );
create policy "active staff read generated invoices" on public.generated_invoices
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read integration deliveries" on public.integration_deliveries
  for select to authenticated using ((select public.is_active_staff()));

revoke all on public.integration_connections, public.notifications,
  public.calendar_events, public.integration_snapshots, public.invoice_profiles,
  public.generated_invoices, public.integration_deliveries from public, anon;
grant select on public.integration_connections, public.notifications,
  public.calendar_events, public.invoice_profiles, public.generated_invoices,
  public.integration_deliveries to authenticated;
grant select on public.integration_snapshots to authenticated;
grant select on public.integration_connections, public.notifications,
  public.calendar_events, public.integration_snapshots, public.invoice_profiles,
  public.generated_invoices, public.integration_deliveries to service_role;

revoke all on function public.update_integration_connection(
  public.integration_provider,boolean,text,text
) from public, anon;
revoke all on function public.create_notification(
  text,text,text,uuid,uuid,uuid,public.notification_channel,
  public.notification_priority,text,text,text,boolean
) from public, anon;
revoke all on function public.review_notification(uuid,boolean,text) from public, anon;
revoke all on function public.queue_operations_sheet_snapshot() from public, anon;
revoke all on function public.queue_document_drive_sync(uuid,text) from public, anon;
revoke all on function public.create_invoice_profile_draft(
  text,text,text,text,text,text,text,text
) from public, anon;
revoke all on function public.approve_invoice_profile(uuid,text) from public, anon;
revoke all on function public.register_generated_invoice(
  uuid,uuid,uuid,uuid,text,date,text
) from public, anon;
revoke all on function public.retry_integration_delivery(uuid,text) from public, anon;
grant execute on function public.update_integration_connection(
  public.integration_provider,boolean,text,text
) to authenticated;
grant execute on function public.create_notification(
  text,text,text,uuid,uuid,uuid,public.notification_channel,
  public.notification_priority,text,text,text,boolean
) to authenticated;
grant execute on function public.review_notification(uuid,boolean,text) to authenticated;
grant execute on function public.queue_operations_sheet_snapshot() to authenticated;
grant execute on function public.queue_document_drive_sync(uuid,text) to authenticated;
grant execute on function public.create_invoice_profile_draft(
  text,text,text,text,text,text,text,text
) to authenticated;
grant execute on function public.approve_invoice_profile(uuid,text) to authenticated;
grant execute on function public.register_generated_invoice(
  uuid,uuid,uuid,uuid,text,date,text
) to authenticated;
grant execute on function public.retry_integration_delivery(uuid,text) to authenticated;

revoke all on function public.claim_integration_deliveries(text,integer)
  from public, anon, authenticated;
revoke all on function public.complete_integration_delivery(uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.fail_integration_delivery(uuid,text,text,text,boolean)
  from public, anon, authenticated;
revoke all on function public.run_automation_tick(timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_integration_deliveries(text,integer) to service_role;
grant execute on function public.complete_integration_delivery(uuid,text,text,text) to service_role;
grant execute on function public.fail_integration_delivery(uuid,text,text,text,boolean) to service_role;
grant execute on function public.run_automation_tick(timestamptz) to service_role;
