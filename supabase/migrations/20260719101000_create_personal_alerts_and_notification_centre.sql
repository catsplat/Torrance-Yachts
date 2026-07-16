-- Release 0.13: personal alert routing, encrypted OAuth credentials, notification
-- receipts, automated AI request support, and workflow-complete reminders.

create type public.user_oauth_connection_status as enum (
  'connected',
  'needs_reauthentication',
  'disconnected'
);

create table public.user_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notification_email text check (
    notification_email is null
    or (
      notification_email = lower(notification_email)
      and char_length(notification_email) <= 320
    )
  ),
  in_app_enabled boolean not null default true,
  telegram_enabled boolean not null default false,
  email_enabled boolean not null default false,
  ai_summary_enabled boolean not null default true,
  new_enquiry_enabled boolean not null default true,
  follow_up_enabled boolean not null default true,
  internal_email_enabled boolean not null default true,
  unknown_email_enabled boolean not null default true,
  task_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  charter_enabled boolean not null default true,
  integration_failure_enabled boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint at_least_one_personal_alert_channel check (
    in_app_enabled or telegram_enabled or email_enabled
  )
);

create table public.user_oauth_connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.integration_provider not null,
  account_email text not null check (
    account_email = lower(account_email) and char_length(account_email) <= 320
  ),
  scopes text[] not null default '{}',
  status public.user_oauth_connection_status not null default 'connected',
  client_id_secret_id uuid not null,
  client_secret_secret_id uuid not null,
  refresh_token_secret_id uuid not null,
  connected_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider),
  constraint personal_oauth_supported_provider check (provider = 'gmail')
);

alter table public.notifications add column read_at timestamptz;
alter table public.integration_deliveries
  add column credential_user_id uuid references public.profiles (id) on delete restrict;

create index notifications_user_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;
create index integration_deliveries_credential_user_idx
  on public.integration_deliveries (credential_user_id, created_at desc)
  where credential_user_id is not null;

create or replace function public.guard_personal_alert_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.personal_alert_command', true), '') <> 'yes' then
    raise exception 'Use an approved personal alert command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_user_notification_preferences
  before insert or update or delete on public.user_notification_preferences
  for each row execute function public.guard_personal_alert_direct_mutation();
create trigger guard_user_oauth_connections
  before insert or update or delete on public.user_oauth_connections
  for each row execute function public.guard_personal_alert_direct_mutation();

create or replace function public.create_user_notification_preferences()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.personal_alert_command', 'yes', true);
  insert into public.user_notification_preferences (
    user_id,
    notification_email,
    updated_by
  ) values (
    new.id,
    new.email,
    new.id
  )
  on conflict (user_id) do nothing;
  perform set_config('app.personal_alert_command', '', true);
  return new;
end;
$$;

create trigger create_user_notification_preferences
  after insert on public.profiles
  for each row execute function public.create_user_notification_preferences();

select set_config('app.personal_alert_command', 'yes', true);
insert into public.user_notification_preferences (
  user_id,
  notification_email,
  updated_by
)
select id, email, id from public.profiles
on conflict (user_id) do nothing;
select set_config('app.personal_alert_command', '', true);

create or replace function public.update_my_alert_preferences(
  p_notification_email text,
  p_phone text,
  p_telegram_chat_id text,
  p_in_app_enabled boolean,
  p_telegram_enabled boolean,
  p_email_enabled boolean,
  p_ai_summary_enabled boolean,
  p_new_enquiry_enabled boolean,
  p_follow_up_enabled boolean,
  p_internal_email_enabled boolean,
  p_unknown_email_enabled boolean,
  p_task_enabled boolean,
  p_payment_enabled boolean,
  p_charter_enabled boolean,
  p_integration_failure_enabled boolean,
  p_reason text
)
returns public.user_notification_preferences
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  updated_record public.user_notification_preferences;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A reason for the alert change is required' using errcode = '22023';
  end if;
  if nullif(trim(p_notification_email), '') is not null
    and (
      lower(trim(p_notification_email)) !~
        '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
      or char_length(trim(p_notification_email)) > 320
    )
  then
    raise exception 'A valid notification email is required' using errcode = '22023';
  end if;
  if p_telegram_enabled and nullif(trim(p_telegram_chat_id), '') is null then
    raise exception 'Telegram alerts require a Telegram chat ID' using errcode = '23514';
  end if;
  if p_email_enabled and nullif(trim(p_notification_email), '') is null then
    raise exception 'Email alerts require a notification email' using errcode = '23514';
  end if;

  update public.profiles
  set phone = nullif(trim(p_phone), ''),
      telegram_chat_id = nullif(trim(p_telegram_chat_id), '')
  where id = actor_id;

  perform set_config('app.personal_alert_command', 'yes', true);
  insert into public.user_notification_preferences (
    user_id,
    notification_email,
    in_app_enabled,
    telegram_enabled,
    email_enabled,
    ai_summary_enabled,
    new_enquiry_enabled,
    follow_up_enabled,
    internal_email_enabled,
    unknown_email_enabled,
    task_enabled,
    payment_enabled,
    charter_enabled,
    integration_failure_enabled,
    updated_by,
    updated_at
  ) values (
    actor_id,
    nullif(lower(trim(p_notification_email)), ''),
    p_in_app_enabled,
    p_telegram_enabled,
    p_email_enabled,
    p_ai_summary_enabled,
    p_new_enquiry_enabled,
    p_follow_up_enabled,
    p_internal_email_enabled,
    p_unknown_email_enabled,
    p_task_enabled,
    p_payment_enabled,
    p_charter_enabled,
    p_integration_failure_enabled,
    actor_id,
    now()
  )
  on conflict (user_id) do update set
    notification_email = excluded.notification_email,
    in_app_enabled = excluded.in_app_enabled,
    telegram_enabled = excluded.telegram_enabled,
    email_enabled = excluded.email_enabled,
    ai_summary_enabled = excluded.ai_summary_enabled,
    new_enquiry_enabled = excluded.new_enquiry_enabled,
    follow_up_enabled = excluded.follow_up_enabled,
    internal_email_enabled = excluded.internal_email_enabled,
    unknown_email_enabled = excluded.unknown_email_enabled,
    task_enabled = excluded.task_enabled,
    payment_enabled = excluded.payment_enabled,
    charter_enabled = excluded.charter_enabled,
    integration_failure_enabled = excluded.integration_failure_enabled,
    updated_by = actor_id,
    updated_at = now()
  returning * into updated_record;
  perform set_config('app.personal_alert_command', '', true);

  insert into public.workflow_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload
  ) values (
    'UserAlertPreferencesUpdated',
    'profile',
    actor_id,
    actor_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'in_app_enabled', p_in_app_enabled,
      'telegram_enabled', p_telegram_enabled,
      'email_enabled', p_email_enabled,
      'ai_summary_enabled', p_ai_summary_enabled
    )
  );
  return updated_record;
end;
$$;

create or replace function public.save_my_gmail_oauth_credentials(
  p_account_email text,
  p_client_id text,
  p_client_secret text,
  p_refresh_token text,
  p_scopes text[],
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  connection_record public.user_oauth_connections;
  client_id_secret uuid;
  client_secret_secret uuid;
  refresh_token_secret uuid;
  secret_prefix text;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A reason for the credential change is required' using errcode = '22023';
  end if;
  if lower(trim(p_account_email)) !~
    '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  then
    raise exception 'A valid Gmail account email is required' using errcode = '22023';
  end if;
  if char_length(trim(p_client_id)) < 8
    or char_length(trim(p_client_secret)) < 8
    or char_length(trim(p_refresh_token)) < 8
  then
    raise exception 'Complete OAuth credentials are required' using errcode = '22023';
  end if;

  select * into connection_record
  from public.user_oauth_connections
  where user_id = actor_id and provider = 'gmail'
  for update;
  secret_prefix := 'torrance:' || actor_id::text || ':gmail:';

  if found and connection_record.status <> 'disconnected' then
    perform vault.update_secret(
      connection_record.client_id_secret_id,
      trim(p_client_id)
    );
    perform vault.update_secret(
      connection_record.client_secret_secret_id,
      trim(p_client_secret)
    );
    perform vault.update_secret(
      connection_record.refresh_token_secret_id,
      trim(p_refresh_token)
    );
    client_id_secret := connection_record.client_id_secret_id;
    client_secret_secret := connection_record.client_secret_secret_id;
    refresh_token_secret := connection_record.refresh_token_secret_id;
  else
    client_id_secret := vault.create_secret(
      trim(p_client_id),
      secret_prefix || 'client-id',
      'Per-user Gmail OAuth client ID'
    );
    client_secret_secret := vault.create_secret(
      trim(p_client_secret),
      secret_prefix || 'client-secret',
      'Per-user Gmail OAuth client secret'
    );
    refresh_token_secret := vault.create_secret(
      trim(p_refresh_token),
      secret_prefix || 'refresh-token',
      'Per-user Gmail OAuth refresh token'
    );
  end if;

  perform set_config('app.personal_alert_command', 'yes', true);
  insert into public.user_oauth_connections (
    user_id,
    provider,
    account_email,
    scopes,
    status,
    client_id_secret_id,
    client_secret_secret_id,
    refresh_token_secret_id,
    connected_at,
    last_error,
    updated_at
  ) values (
    actor_id,
    'gmail',
    lower(trim(p_account_email)),
    coalesce(p_scopes, '{}'),
    'connected',
    client_id_secret,
    client_secret_secret,
    refresh_token_secret,
    now(),
    null,
    now()
  )
  on conflict (user_id, provider) do update set
    account_email = excluded.account_email,
    scopes = excluded.scopes,
    status = 'connected',
    client_id_secret_id = excluded.client_id_secret_id,
    client_secret_secret_id = excluded.client_secret_secret_id,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    connected_at = now(),
    last_error = null,
    updated_at = now();
  perform set_config('app.personal_alert_command', '', true);

  insert into public.workflow_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload
  ) values (
    'UserOAuthCredentialsUpdated',
    'profile',
    actor_id,
    actor_id,
    jsonb_build_object(
      'provider', 'gmail',
      'account_email', lower(trim(p_account_email)),
      'scope_count', cardinality(coalesce(p_scopes, '{}')),
      'reason', trim(p_reason)
    )
  );
end;
$$;

create or replace function public.disconnect_my_gmail_oauth(p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  connection_record public.user_oauth_connections;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A disconnect reason is required' using errcode = '22023';
  end if;
  select * into connection_record
  from public.user_oauth_connections
  where user_id = actor_id and provider = 'gmail'
  for update;
  if not found then
    raise exception 'No Gmail OAuth connection exists' using errcode = 'P0002';
  end if;

  delete from vault.secrets
  where id in (
    connection_record.client_id_secret_id,
    connection_record.client_secret_secret_id,
    connection_record.refresh_token_secret_id
  );
  perform set_config('app.personal_alert_command', 'yes', true);
  update public.user_oauth_connections
  set status = 'disconnected',
      last_error = null,
      updated_at = now()
  where user_id = actor_id and provider = 'gmail';
  perform set_config('app.personal_alert_command', '', true);

  insert into public.workflow_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload
  ) values (
    'UserOAuthDisconnected',
    'profile',
    actor_id,
    actor_id,
    jsonb_build_object('provider', 'gmail', 'reason', trim(p_reason))
  );
end;
$$;

create or replace function public.get_my_oauth_connections()
returns table (
  provider public.integration_provider,
  account_email text,
  scopes text[],
  status public.user_oauth_connection_status,
  connected_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    connection.provider,
    connection.account_email,
    connection.scopes,
    connection.status,
    connection.connected_at,
    connection.last_success_at,
    connection.last_failure_at,
    connection.last_error,
    connection.updated_at
  from public.user_oauth_connections connection
  where public.is_active_staff()
    and connection.user_id = (select auth.uid());
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.notifications
  set read_at = coalesce(read_at, now()), updated_at = now()
  where id = p_notification_id
    and recipient_user_id = (select auth.uid());
  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;
  perform set_config('app.phase11_command', '', true);
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  changed_count integer;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.notifications
  set read_at = now(), updated_at = now()
  where recipient_user_id = (select auth.uid()) and read_at is null;
  get diagnostics changed_count = row_count;
  perform set_config('app.phase11_command', '', true);
  return changed_count;
end;
$$;

create or replace function public.personal_notification_channels(p_user_id uuid)
returns setof public.notification_channel
language sql stable security definer set search_path = '' as $$
  select 'in_app'::public.notification_channel
  from public.user_notification_preferences preference
  join public.profiles profile on profile.id = preference.user_id
  where preference.user_id = p_user_id
    and profile.active
    and preference.in_app_enabled
  union all
  select 'telegram'::public.notification_channel
  from public.user_notification_preferences preference
  join public.profiles profile on profile.id = preference.user_id
  where preference.user_id = p_user_id
    and profile.active
    and preference.telegram_enabled
    and profile.telegram_chat_id is not null
    and exists (
      select 1 from public.integration_connections
      where provider = 'telegram' and enabled
    )
  union all
  select 'email_alert'::public.notification_channel
  from public.user_notification_preferences preference
  join public.profiles profile on profile.id = preference.user_id
  where preference.user_id = p_user_id
    and profile.active
    and preference.email_enabled
    and preference.notification_email is not null
    and exists (
      select 1 from public.integration_connections
      where provider = 'gmail' and enabled
    )
    and exists (
      select 1 from public.user_oauth_connections connection
      where connection.user_id = p_user_id
        and connection.provider = 'gmail'
        and connection.status = 'connected'
    );
$$;

create or replace function public.queue_notification_delivery(p_notification_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  notification_record public.notifications;
  delivery_id uuid;
  selected_provider public.integration_provider;
  selected_operation public.integration_operation;
  recipient_reference text;
  selected_credential_user uuid;
begin
  select * into notification_record
  from public.notifications where id = p_notification_id for update;
  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

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
  elsif notification_record.channel = 'email_alert' then
    selected_provider := 'gmail';
    selected_operation := 'gmail_send_internal';
    selected_credential_user := notification_record.recipient_user_id;
    if selected_credential_user is null then
      raise exception 'Email alerts are restricted to internal users'
        using errcode = '23514';
    end if;
    select preference.notification_email into recipient_reference
    from public.user_notification_preferences preference
    join public.profiles profile on profile.id = preference.user_id
    where preference.user_id = selected_credential_user
      and profile.active
      and preference.email_enabled;
    if not exists (
      select 1 from public.user_oauth_connections connection
      where connection.user_id = selected_credential_user
        and connection.provider = 'gmail'
        and connection.status = 'connected'
    ) then
      raise exception 'The recipient has no connected Gmail OAuth credentials'
        using errcode = '23514';
    end if;
  else
    selected_provider := 'gmail';
    selected_operation := 'gmail_create_draft';
    selected_credential_user := coalesce(
      notification_record.approved_by,
      notification_record.created_by
    );
    if selected_credential_user is null or not exists (
      select 1 from public.user_oauth_connections connection
      where connection.user_id = selected_credential_user
        and connection.provider = 'gmail'
        and connection.status = 'connected'
    ) then
      raise exception 'The reviewing user has no connected Gmail OAuth credentials'
        using errcode = '23514';
    end if;
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
    provider,
    operation,
    idempotency_key,
    source_type,
    source_id,
    credential_user_id,
    payload
  ) values (
    selected_provider,
    selected_operation,
    'notification:' || notification_record.id::text,
    'notification',
    notification_record.id,
    selected_credential_user,
    jsonb_build_object(
      'recipient', recipient_reference,
      'title', notification_record.title,
      'body', notification_record.body,
      'action_url', notification_record.action_url,
      'priority', notification_record.priority
    )
  )
  on conflict (idempotency_key) do update
    set payload = excluded.payload,
        credential_user_id = excluded.credential_user_id,
        updated_at = now()
    where public.integration_deliveries.status in ('pending', 'failed')
  returning id into delivery_id;
  update public.notifications
  set status = 'queued', updated_at = now()
  where id = notification_record.id;
  perform set_config('app.phase11_command', '', true);
  return delivery_id;
end;
$$;

create or replace function public.materialise_operational_notifications(
  p_as_of timestamptz default now()
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  created_count integer := 0;
  inserted_count integer := 0;
begin
  perform set_config('app.phase11_command', 'yes', true);

  insert into public.notifications (
    idempotency_key,
    notification_type,
    source_type,
    source_id,
    recipient_user_id,
    channel,
    priority,
    title,
    body,
    action_url,
    requires_approval,
    status,
    approved_by,
    approved_at,
    approval_reason
  )
  select
    'email_received:' || message.id::text || ':' || profile.id::text || ':' ||
      channel.channel::text,
    'email_received',
    'email_message',
    message.id,
    profile.id,
    channel.channel,
    case
      when message.classification = 'unclassified'
        then 'high'::public.notification_priority
      else 'normal'::public.notification_priority
    end,
    case message.classification
      when 'new_enquiry' then 'New charter enquiry'
      when 'enquiry_follow_up' then 'Enquiry follow-up received'
      when 'internal' then 'Internal email received'
      when 'other_relevant' then 'Relevant email received'
      else 'Email requires review'
    end,
    'From ' || message.sender_email || E'\n\n' || message.subject ||
      case
        when preference.ai_summary_enabled and suggestion.summary is not null
          then E'\n\nAI summary (review required):\n' || suggestion.summary ||
            case
              when suggestion.reviewed_payload->'draft'->>'body' <> ''
                then E'\n\nSuggested reply (not sent):\n' ||
                  left(suggestion.reviewed_payload->'draft'->>'body', 3500)
              else ''
            end
        when message.snippet <> '' then E'\n\n' || message.snippet
        else ''
      end,
    '/emails/' || message.id::text,
    false,
    'approved',
    profile.id,
    now(),
    'Internal alert generated from stored email and optional AI suggestion'
  from public.email_messages message
  cross join public.profiles profile
  join public.user_notification_preferences preference
    on preference.user_id = profile.id
  cross join lateral (
    select personal_channel as channel
    from public.personal_notification_channels(profile.id) personal_channel
  ) channel
  left join lateral (
    select ai_suggestion.summary, ai_suggestion.reviewed_payload
    from public.ai_suggestions ai_suggestion
    where ai_suggestion.source_type = 'email_message'
      and ai_suggestion.source_id = message.id
      and ai_suggestion.analysis_kind = 'email_triage'
      and ai_suggestion.status in ('pending_review', 'approved')
    order by ai_suggestion.created_at desc
    limit 1
  ) suggestion on true
  where profile.active
    and message.classification <> 'circular'
    and message.received_at >= profile.created_at
    and case message.classification
      when 'new_enquiry' then preference.new_enquiry_enabled
      when 'enquiry_follow_up' then preference.follow_up_enabled
      when 'internal' then preference.internal_email_enabled
      else preference.unknown_email_enabled
    end
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key,
    notification_type,
    source_type,
    source_id,
    recipient_user_id,
    channel,
    priority,
    title,
    body,
    action_url,
    requires_approval,
    status,
    approved_by,
    approved_at,
    approval_reason
  )
  select
    'task_due:' || task.id::text || ':' || task.due_date::text || ':' ||
      target.user_id::text || ':' || channel.channel::text,
    'task_due',
    'task',
    task.id,
    target.user_id,
    channel.channel,
    case
      when task.due_date < p_as_of::date then 'urgent'::public.notification_priority
      when task.priority in ('high', 'urgent')
        then task.priority::text::public.notification_priority
      else 'normal'::public.notification_priority
    end,
    case when task.due_date < p_as_of::date then 'Overdue task' else 'Task due' end ||
      coalesce(' · ' || task.step_code, ''),
    task.title || E'\n\nBooking ' || booking.reference || ' · ' || yacht.name ||
      E'\nDue ' || task.due_date::text,
    '/tasks/' || task.id::text,
    false,
    'approved',
    target.user_id,
    now(),
    'Deterministic internal task reminder'
  from public.tasks task
  join public.bookings booking on booking.id = task.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  cross join lateral (
    select task.assigned_user_id as user_id
    where task.assigned_user_id is not null
    union all
    select profile.id
    from public.profiles profile
    where task.assigned_user_id is null
      and profile.active
      and profile.role = 'administrator'
  ) target
  join public.user_notification_preferences preference
    on preference.user_id = target.user_id and preference.task_enabled
  cross join lateral (
    select personal_channel as channel
    from public.personal_notification_channels(target.user_id) personal_channel
  ) channel
  where task.status = 'ready'
    and task.due_date is not null
    and task.due_date <= p_as_of::date + coalesce(task.reminder_lead_days, 0)
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key,
    notification_type,
    source_type,
    source_id,
    recipient_user_id,
    channel,
    priority,
    title,
    body,
    action_url,
    requires_approval,
    status,
    approved_by,
    approved_at,
    approval_reason
  )
  select
    'payment_due:' || payment.id::text || ':' || payment.due_date::text || ':' ||
      profile.id::text || ':' || channel.channel::text,
    'payment_due',
    'payment',
    payment.id,
    profile.id,
    channel.channel,
    case
      when payment.due_date < p_as_of::date then 'urgent'::public.notification_priority
      else 'high'::public.notification_priority
    end,
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
    profile.id,
    now(),
    'Deterministic internal payment reminder'
  from public.payment_schedules payment
  join public.bookings booking on booking.id = payment.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  left join public.contacts broker on broker.id = booking.broker_contact_id
  cross join public.profiles profile
  join public.user_notification_preferences preference
    on preference.user_id = profile.id and preference.payment_enabled
  cross join lateral (
    select personal_channel as channel
    from public.personal_notification_channels(profile.id) personal_channel
  ) channel
  where profile.active
    and payment.status = 'scheduled'
    and payment.due_date <= p_as_of::date + 7
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key,
    notification_type,
    source_type,
    source_id,
    recipient_user_id,
    channel,
    priority,
    title,
    body,
    action_url,
    requires_approval,
    status,
    approved_by,
    approved_at,
    approval_reason
  )
  select
    'charter:' || milestone.kind || ':' || booking.id::text || ':' ||
      milestone.event_date::text || ':' || profile.id::text || ':' ||
      channel.channel::text,
    'charter_' || milestone.kind,
    'booking',
    booking.id,
    profile.id,
    channel.channel,
    'high',
    case milestone.kind
      when 'start' then 'Charter starts today'
      else 'Charter ends today'
    end,
    booking.reference || ' · ' || yacht.name || E'\n' ||
      booking.charter_start_date::text || ' to ' ||
      booking.charter_end_date::text ||
      E'\n\nOpen the booking to review and record the required status action.',
    '/bookings/' || booking.id::text,
    false,
    'approved',
    profile.id,
    now(),
    'Internal charter milestone reminder; status remains human-controlled'
  from public.bookings booking
  join public.yachts yacht on yacht.id = booking.yacht_id
  cross join lateral (
    values
      ('start'::text, booking.charter_start_date),
      ('end'::text, booking.charter_end_date)
  ) milestone(kind, event_date)
  cross join public.profiles profile
  join public.user_notification_preferences preference
    on preference.user_id = profile.id and preference.charter_enabled
  cross join lateral (
    select personal_channel as channel
    from public.personal_notification_channels(profile.id) personal_channel
  ) channel
  where profile.active
    and booking.status in ('confirmed', 'charter_active')
    and milestone.event_date = p_as_of::date
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications (
    idempotency_key,
    notification_type,
    source_type,
    source_id,
    recipient_user_id,
    channel,
    priority,
    title,
    body,
    action_url,
    requires_approval,
    status,
    approved_by,
    approved_at,
    approval_reason
  )
  select
    'integration_failed:' || delivery.id::text || ':' || profile.id::text || ':' ||
      channel.channel::text,
    'integration_failure',
    'integration_delivery',
    delivery.id,
    profile.id,
    channel.channel,
    'urgent',
    'Integration delivery needs attention',
    initcap(replace(delivery.provider::text, '_', ' ')) || ' · ' ||
      replace(delivery.operation::text, '_', ' ') ||
      coalesce(E'\n\n' || delivery.last_error_message, ''),
    '/integrations',
    false,
    'approved',
    profile.id,
    now(),
    'Internal integration failure alert'
  from public.integration_deliveries delivery
  cross join public.profiles profile
  join public.user_notification_preferences preference
    on preference.user_id = profile.id
      and preference.integration_failure_enabled
  cross join lateral (
    select 'in_app'::public.notification_channel as channel
    where preference.in_app_enabled
  ) channel
  where delivery.status = 'failed'
    and profile.active
    and profile.role = 'administrator'
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

create or replace function public.request_ai_analysis(
  p_request_key text,
  p_analysis_kind public.ai_analysis_kind,
  p_source_type text,
  p_source_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_sha256 text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  run_id uuid;
  request_user_id uuid;
begin
  if not public.is_active_staff()
    and coalesce((select auth.role()), '') <> 'service_role'
  then
    raise exception 'An active internal account is required'
      using errcode = '42501';
  end if;
  if p_analysis_kind = 'email_triage' and (
    p_source_type <> 'email_message'
    or not exists (select 1 from public.email_messages where id = p_source_id)
  ) then
    raise exception 'Email analysis requires an existing email message'
      using errcode = '23514';
  end if;
  if p_analysis_kind = 'contract_extraction' and (
    p_source_type <> 'document'
    or not exists (
      select 1 from public.documents
      where id = p_source_id
        and document_type = 'charter_agreement'
        and verification_status = 'verified'
    )
  ) then
    raise exception 'Contract extraction requires a verified charter agreement'
      using errcode = '23514';
  end if;
  select id into run_id
  from public.ai_runs
  where request_key = trim(p_request_key);
  if found then
    return run_id;
  end if;
  request_user_id := (select auth.uid());
  if request_user_id is null then
    select id into request_user_id
    from public.profiles
    where active
    order by (role = 'administrator') desc, created_at
    limit 1;
  end if;
  if request_user_id is null then
    raise exception 'No active internal account can own this AI request'
      using errcode = '23514';
  end if;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.ai_runs (
    request_key,
    analysis_kind,
    source_type,
    source_id,
    provider,
    model,
    prompt_version,
    input_sha256,
    requested_by
  ) values (
    trim(p_request_key),
    p_analysis_kind,
    p_source_type,
    p_source_id,
    lower(trim(p_provider)),
    trim(p_model),
    lower(trim(p_prompt_version)),
    lower(trim(p_input_sha256)),
    request_user_id
  )
  returning id into run_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload
  ) values (
    'AIAnalysisRequested',
    p_source_type,
    p_source_id,
    request_user_id,
    jsonb_build_object(
      'run_id', run_id,
      'analysis_kind', p_analysis_kind,
      'provider', lower(trim(p_provider)),
      'model', trim(p_model),
      'prompt_version', lower(trim(p_prompt_version)),
      'automatic', (select auth.uid()) is null
    )
  );
  return run_id;
end;
$$;

create or replace function public.get_delivery_oauth_credentials(p_delivery_id uuid)
returns table (
  account_email text,
  client_id text,
  client_secret text,
  refresh_token text
)
language sql security definer set search_path = '' as $$
  select
    connection.account_email,
    client_id.decrypted_secret,
    client_secret.decrypted_secret,
    refresh_token.decrypted_secret
  from public.integration_deliveries delivery
  join public.user_oauth_connections connection
    on connection.user_id = delivery.credential_user_id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
  join vault.decrypted_secrets client_id
    on client_id.id = connection.client_id_secret_id
  join vault.decrypted_secrets client_secret
    on client_secret.id = connection.client_secret_secret_id
  join vault.decrypted_secrets refresh_token
    on refresh_token.id = connection.refresh_token_secret_id
  where current_user in ('service_role', 'postgres', 'supabase_admin')
    and delivery.id = p_delivery_id
    and delivery.status = 'claimed'
    and delivery.operation in ('gmail_send_internal', 'gmail_create_draft');
$$;

create or replace function public.claim_internal_alert_deliveries(
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
    select id
    from public.integration_deliveries
    where operation in (
      'telegram_send',
      'gmail_send_internal',
      'gmail_create_draft'
    )
      and (
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

alter table public.user_notification_preferences enable row level security;
alter table public.user_oauth_connections enable row level security;

create policy "users read their alert preferences"
  on public.user_notification_preferences for select to authenticated
  using (
    (select public.is_active_staff())
    and user_id = (select auth.uid())
  );

drop policy "active staff read notifications" on public.notifications;
create policy "users read relevant notifications"
  on public.notifications for select to authenticated
  using (
    (select public.is_active_staff())
    and (
      recipient_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or (select public.is_administrator())
    )
  );

revoke all on public.user_notification_preferences,
  public.user_oauth_connections from public, anon, authenticated;
grant select on public.user_notification_preferences to authenticated;
grant select on public.user_notification_preferences,
  public.user_oauth_connections to service_role;

revoke all on function public.guard_personal_alert_direct_mutation()
  from public, anon, authenticated;
revoke all on function public.create_user_notification_preferences()
  from public, anon, authenticated;
revoke all on function public.update_my_alert_preferences(
  text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,
  boolean,boolean,boolean,boolean,boolean,text
) from public, anon;
revoke all on function public.save_my_gmail_oauth_credentials(
  text,text,text,text,text[],text
) from public, anon;
revoke all on function public.disconnect_my_gmail_oauth(text)
  from public, anon;
revoke all on function public.get_my_oauth_connections()
  from public, anon;
revoke all on function public.mark_notification_read(uuid)
  from public, anon;
revoke all on function public.mark_all_notifications_read()
  from public, anon;
revoke all on function public.personal_notification_channels(uuid)
  from public, anon, authenticated;
revoke all on function public.get_delivery_oauth_credentials(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_internal_alert_deliveries(text,integer)
  from public, anon, authenticated;

grant execute on function public.update_my_alert_preferences(
  text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,
  boolean,boolean,boolean,boolean,boolean,text
) to authenticated;
grant execute on function public.save_my_gmail_oauth_credentials(
  text,text,text,text,text[],text
) to authenticated;
grant execute on function public.disconnect_my_gmail_oauth(text)
  to authenticated;
grant execute on function public.get_my_oauth_connections()
  to authenticated;
grant execute on function public.mark_notification_read(uuid)
  to authenticated;
grant execute on function public.mark_all_notifications_read()
  to authenticated;
grant execute on function public.personal_notification_channels(uuid)
  to service_role;
grant execute on function public.get_delivery_oauth_credentials(uuid)
  to service_role;
grant execute on function public.claim_internal_alert_deliveries(text,integer)
  to service_role;
grant execute on function public.request_ai_analysis(
  text,public.ai_analysis_kind,text,uuid,text,text,text,text
) to service_role;
