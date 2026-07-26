-- Staff pair a Telegram destination through a short-lived bot deep link.
-- The database stores only a SHA-256 token hash; the raw link token exists only
-- in the initiating user's server-action response.

create table public.telegram_pairing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint telegram_pairing_request_expiry check (expires_at > created_at)
);

create index telegram_pairing_requests_pending_user_idx
  on public.telegram_pairing_requests (user_id, expires_at desc)
  where consumed_at is null;

create or replace function public.guard_telegram_pairing_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.telegram_pairing_command', true), '') <> 'yes' then
    raise exception 'Use an approved Telegram pairing command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_telegram_pairing_requests
  before insert or update or delete on public.telegram_pairing_requests
  for each row execute function public.guard_telegram_pairing_direct_mutation();

create or replace function public.create_my_telegram_pairing_request(
  p_token_hash text
)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  expiry timestamptz := now() + interval '10 minutes';
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if lower(trim(p_token_hash)) !~ '^[a-f0-9]{64}$' then
    raise exception 'An invalid pairing request was supplied' using errcode = '22023';
  end if;

  perform set_config('app.telegram_pairing_command', 'yes', true);
  update public.telegram_pairing_requests
  set consumed_at = now()
  where user_id = actor_id and consumed_at is null;
  insert into public.telegram_pairing_requests (user_id, token_hash, expires_at)
  values (actor_id, lower(trim(p_token_hash)), expiry);
  perform set_config('app.telegram_pairing_command', '', true);

  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values (
    'TelegramPairingRequested',
    'profile',
    actor_id,
    actor_id,
    jsonb_build_object('expires_at', expiry)
  );
  return expiry;
end;
$$;

create or replace function public.complete_telegram_pairing(
  p_token_hash text,
  p_telegram_chat_id text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  pairing_record public.telegram_pairing_requests;
  clean_chat_id text := trim(p_telegram_chat_id);
begin
  if lower(trim(p_token_hash)) !~ '^[a-f0-9]{64}$'
    or clean_chat_id !~ '^-?[0-9]{1,63}$'
  then
    raise exception 'Invalid Telegram pairing payload' using errcode = '22023';
  end if;

  select * into pairing_record
  from public.telegram_pairing_requests
  where token_hash = lower(trim(p_token_hash))
    and consumed_at is null
    and expires_at > now()
  for update;
  if not found then
    return 'ignored';
  end if;

  if not exists (select 1 from public.profiles where id = pairing_record.user_id and active) then
    perform set_config('app.telegram_pairing_command', 'yes', true);
    update public.telegram_pairing_requests set consumed_at = now() where id = pairing_record.id;
    perform set_config('app.telegram_pairing_command', '', true);
    return 'ignored';
  end if;

  perform set_config('app.telegram_pairing_command', 'yes', true);
  update public.profiles set telegram_chat_id = clean_chat_id, updated_at = now() where id = pairing_record.user_id;
  perform set_config('app.personal_alert_command', 'yes', true);
  update public.user_notification_preferences
  set telegram_enabled = true, updated_by = pairing_record.user_id, updated_at = now()
  where user_id = pairing_record.user_id;
  perform set_config('app.personal_alert_command', '', true);
  update public.telegram_pairing_requests set consumed_at = now() where id = pairing_record.id;
  perform set_config('app.telegram_pairing_command', '', true);

  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values (
    'TelegramPaired',
    'profile',
    pairing_record.user_id,
    pairing_record.user_id,
    jsonb_build_object('method', 'bot_deep_link')
  );
  return 'connected';
end;
$$;

alter table public.telegram_pairing_requests enable row level security;

revoke all on public.telegram_pairing_requests from public, anon, authenticated;
revoke all on function public.guard_telegram_pairing_direct_mutation() from public, anon, authenticated;
revoke all on function public.create_my_telegram_pairing_request(text) from public, anon;
revoke all on function public.complete_telegram_pairing(text, text) from public, anon, authenticated;
grant execute on function public.create_my_telegram_pairing_request(text) to authenticated;
grant execute on function public.complete_telegram_pairing(text, text) to service_role;
