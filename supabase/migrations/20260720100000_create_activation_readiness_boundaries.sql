-- Final Phase 12 hardening: one-time bootstrap and redacted activation status.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, active)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(lower(new.email), '@', 1), ''),
      'Internal user'
    ),
    lower(new.email),
    not (coalesce(new.raw_user_meta_data ->> '_initial_setup_pending', 'false') = 'true')
  );

  return new;
end;
$$;

create or replace function public.get_initial_setup_profile_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.profiles;
$$;

create or replace function public.complete_initial_administrator(
  p_user_id uuid,
  p_display_name text,
  p_phone text,
  p_telegram_chat_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(p_display_name);
  clean_phone text := nullif(trim(p_phone), '');
  clean_telegram text := nullif(trim(p_telegram_chat_id), '');
begin
  if char_length(clean_name) not between 2 and 100
     or (clean_phone is not null and char_length(clean_phone) not between 7 and 32)
     or (clean_telegram is not null and char_length(clean_telegram) not between 1 and 64)
  then
    raise exception 'Invalid initial administrator profile values' using errcode = '22023';
  end if;

  if (select count(*) from public.profiles) <> 1
     or not exists (
       select 1 from public.profiles
       where id = p_user_id and active = false and role = 'staff'
     )
  then
    return false;
  end if;

  update public.profiles
  set active = true,
      display_name = clean_name,
      phone = clean_phone,
      role = 'administrator',
      telegram_chat_id = clean_telegram
  where id = p_user_id;

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InitialAdministratorCreated', 'profile', p_user_id, p_user_id,
    jsonb_build_object('setup_method', 'one_time_token')
  );

  return true;
end;
$$;

create or replace function public.get_activation_readiness_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'connections', coalesce(
      (
        select jsonb_object_agg(
          connection.provider::text,
          jsonb_build_object(
            'enabled', connection.enabled,
            'last_success_at', connection.last_success_at,
            'last_failure_at', connection.last_failure_at
          )
        )
        from public.integration_connections connection
      ),
      '{}'::jsonb
    ),
    'last_email_received_at', (select max(message.received_at) from public.email_messages message),
    'telegram_user_count', (
      select count(*) from public.profiles profile
      where profile.active and profile.telegram_chat_id is not null
    ),
    'gmail_user_count', (
      select count(*) from public.user_oauth_connections connection
      where connection.provider = 'gmail' and connection.status = 'connected'
    )
  );
$$;

revoke all on function public.get_initial_setup_profile_count()
  from public, anon, authenticated;
revoke all on function public.complete_initial_administrator(uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.get_activation_readiness_snapshot()
  from public, anon, authenticated;

grant execute on function public.get_initial_setup_profile_count() to service_role;
grant execute on function public.complete_initial_administrator(uuid,text,text,text)
  to service_role;
grant execute on function public.get_activation_readiness_snapshot() to service_role;
