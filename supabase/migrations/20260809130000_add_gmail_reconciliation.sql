-- Let one administrator-selected Google Workspace connection supply Gmail
-- history reconciliation. PostgreSQL owns the selection and cursor; n8n only
-- calls the bounded automation tick.

create table public.gmail_ingestion_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  user_id uuid references public.profiles (id) on delete restrict,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint gmail_ingestion_enabled_user check (not enabled or user_id is not null)
);

insert into public.gmail_ingestion_settings (singleton) values (true);

create table public.gmail_reconciliation_states (
  user_id uuid primary key references public.profiles (id) on delete restrict,
  account_email text not null check (account_email = lower(trim(account_email))),
  last_history_id text check (last_history_id is null or last_history_id ~ '^[0-9]+$'),
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  updated_at timestamptz not null default now()
);

create trigger guard_gmail_ingestion_settings
  before insert or update or delete on public.gmail_ingestion_settings
  for each row execute function public.guard_phase11_direct_mutation();
create trigger guard_gmail_reconciliation_states
  before insert or update or delete on public.gmail_reconciliation_states
  for each row execute function public.guard_phase11_direct_mutation();

alter table public.gmail_ingestion_settings enable row level security;
alter table public.gmail_reconciliation_states enable row level security;
revoke all on public.gmail_ingestion_settings, public.gmail_reconciliation_states
  from public, anon, authenticated;
grant select, insert, update on public.gmail_ingestion_settings,
  public.gmail_reconciliation_states to service_role;

create or replace function public.list_google_mailbox_candidates()
returns table (
  user_id uuid,
  display_name text,
  account_email text,
  selected boolean,
  ingestion_enabled boolean,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return query
  select
    profile.id,
    profile.display_name,
    connection.account_email,
    settings.user_id = profile.id,
    settings.enabled and settings.user_id = profile.id,
    state.last_success_at,
    state.last_failure_at,
    state.last_error
  from public.profiles profile
  join public.user_oauth_connections connection
    on connection.user_id = profile.id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
  cross join public.gmail_ingestion_settings settings
  left join public.gmail_reconciliation_states state on state.user_id = profile.id
  where profile.active
  order by profile.display_name, connection.account_email;
end;
$$;

create or replace function public.configure_gmail_ingestion(
  p_user_id uuid,
  p_enabled boolean
)
returns public.gmail_ingestion_settings
language plpgsql security definer set search_path = '' as $$
declare
  account text;
  configured public.gmail_ingestion_settings;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_enabled then
    select connection.account_email into account
    from public.user_oauth_connections connection
    join public.profiles profile on profile.id = connection.user_id and profile.active
    where connection.user_id = p_user_id
      and connection.provider = 'gmail'
      and connection.status = 'connected'
      and connection.scopes @> array[
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ]::text[];
    if account is null then
      raise exception 'Select an active staff Google connection with Gmail access'
        using errcode = '23514';
    end if;
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  update public.gmail_ingestion_settings
  set enabled = p_enabled,
      user_id = case when p_enabled then p_user_id else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where singleton
  returning * into configured;
  if p_enabled then
    insert into public.gmail_reconciliation_states (user_id, account_email)
    values (p_user_id, account)
    on conflict (user_id) do update
      set account_email = excluded.account_email,
          updated_at = now();
  end if;
  perform set_config('app.phase11_command', '', true);
  return configured;
end;
$$;

create or replace function public.get_active_gmail_ingestion_credentials()
returns table (
  user_id uuid,
  account_email text,
  client_id text,
  client_secret text,
  refresh_token text,
  scopes text[],
  last_history_id text
)
language sql security definer set search_path = '' as $$
  select
    connection.user_id,
    connection.account_email,
    client_id.decrypted_secret,
    client_secret.decrypted_secret,
    refresh_token.decrypted_secret,
    connection.scopes,
    state.last_history_id
  from public.gmail_ingestion_settings settings
  join public.user_oauth_connections connection
    on connection.user_id = settings.user_id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
  join public.profiles profile on profile.id = connection.user_id and profile.active
  join vault.decrypted_secrets client_id on client_id.id = connection.client_id_secret_id
  join vault.decrypted_secrets client_secret on client_secret.id = connection.client_secret_secret_id
  join vault.decrypted_secrets refresh_token on refresh_token.id = connection.refresh_token_secret_id
  left join public.gmail_reconciliation_states state on state.user_id = connection.user_id
  where settings.singleton and settings.enabled
    and current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

create or replace function public.complete_gmail_reconciliation(
  p_user_id uuid,
  p_history_id text,
  p_synced_at timestamptz
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  if p_history_id !~ '^[0-9]+$' then
    raise exception 'Invalid Gmail history cursor' using errcode = '22023';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.gmail_reconciliation_states
  set last_history_id = p_history_id,
      last_sync_at = p_synced_at,
      last_success_at = p_synced_at,
      last_failure_at = null,
      last_error = null,
      updated_at = now()
  where user_id = p_user_id;
  if not found then raise exception 'Gmail reconciliation state not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase11_command', '', true);
end;
$$;

create or replace function public.fail_gmail_reconciliation(
  p_user_id uuid,
  p_error text,
  p_failed_at timestamptz
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  perform set_config('app.phase11_command', 'yes', true);
  update public.gmail_reconciliation_states
  set last_failure_at = p_failed_at,
      last_error = left(nullif(trim(p_error), ''), 500),
      updated_at = now()
  where user_id = p_user_id;
  if not found then raise exception 'Gmail reconciliation state not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase11_command', '', true);
end;
$$;

revoke all on function public.list_google_mailbox_candidates() from public, anon;
revoke all on function public.configure_gmail_ingestion(uuid, boolean) from public, anon;
revoke all on function public.get_active_gmail_ingestion_credentials() from public, anon, authenticated;
revoke all on function public.complete_gmail_reconciliation(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_gmail_reconciliation(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.list_google_mailbox_candidates() to authenticated;
grant execute on function public.configure_gmail_ingestion(uuid, boolean) to authenticated;
grant execute on function public.get_active_gmail_ingestion_credentials() to service_role;
grant execute on function public.complete_gmail_reconciliation(uuid, text, timestamptz) to service_role;
grant execute on function public.fail_gmail_reconciliation(uuid, text, timestamptz) to service_role;

