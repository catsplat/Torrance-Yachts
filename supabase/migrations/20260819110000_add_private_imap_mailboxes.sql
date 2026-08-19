-- Generic IMAP is an additional private mailbox adapter. Gmail remains intact;
-- both adapters write through the same owner-aware email workflow tables.

alter table public.email_threads drop constraint if exists email_threads_provider_check;
alter table public.email_messages drop constraint if exists email_messages_provider_check;
alter table public.email_threads add constraint email_threads_provider_check check (provider in ('gmail', 'imap'));
alter table public.email_messages add constraint email_messages_provider_check check (provider in ('gmail', 'imap'));

create table public.imap_mailbox_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_email text not null check (account_email = lower(account_email) and account_email like '%@%'),
  host text not null check (char_length(trim(host)) between 3 and 253),
  port integer not null check (port between 1 and 65535),
  tls boolean not null default true,
  folders text[] not null default array['INBOX']::text[] check (cardinality(folders) between 1 and 12),
  app_password_secret_id uuid not null references vault.secrets(id) on delete restrict,
  enabled boolean not null default false,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'reauthentication_required')),
  last_uid_validity text,
  last_uid bigint,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_email, host, port)
);
create index imap_mailbox_connections_enabled_idx on public.imap_mailbox_connections (enabled, updated_at) where enabled;

create table public.imap_mailbox_folder_sync_states (
  connection_id uuid not null references public.imap_mailbox_connections(id) on delete cascade,
  folder text not null check (char_length(trim(folder)) between 1 and 200),
  last_uid_validity text,
  last_uid bigint,
  last_synced_at timestamptz,
  primary key (connection_id, folder)
);
alter table public.imap_mailbox_folder_sync_states enable row level security;
revoke all on public.imap_mailbox_folder_sync_states from anon, authenticated;

alter table public.imap_mailbox_connections enable row level security;
create policy "users view own imap mailbox metadata" on public.imap_mailbox_connections
  for select to authenticated using (user_id = (select auth.uid()) and (select public.is_active_staff()));
revoke all on public.imap_mailbox_connections from anon;
grant select on public.imap_mailbox_connections to authenticated;

create or replace function public.save_my_imap_mailbox_connection(
  p_account_email text,
  p_host text,
  p_port integer,
  p_tls boolean,
  p_folders text[],
  p_app_password text,
  p_enabled boolean
)
returns public.imap_mailbox_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  existing public.imap_mailbox_connections;
  secret_id uuid;
  result public.imap_mailbox_connections;
  normalised_folders text[];
begin
  if not public.is_active_staff() or actor_id is null then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_app_password, ''))) < 8 then
    raise exception 'Use an app password issued by the mailbox provider' using errcode = '22023';
  end if;
  if trim(coalesce(p_account_email, '')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or trim(coalesce(p_host, '')) !~* '^[a-z0-9.-]+$'
    or p_port not between 1 and 65535 then
    raise exception 'Mailbox connection details are invalid' using errcode = '22023';
  end if;
  select array_agg(distinct upper(trim(folder)) order by upper(trim(folder))) into normalised_folders
  from unnest(coalesce(p_folders, '{}'::text[])) folder
  where char_length(trim(folder)) between 1 and 200;
  if normalised_folders is null or cardinality(normalised_folders) > 12 then
    raise exception 'Choose between one and twelve mailbox folders' using errcode = '22023';
  end if;

  select * into existing from public.imap_mailbox_connections
  where user_id = actor_id and account_email = lower(trim(p_account_email))
    and host = lower(trim(p_host)) and port = p_port for update;
  if found then
    secret_id := existing.app_password_secret_id;
    perform vault.update_secret(secret_id, trim(p_app_password));
    update public.imap_mailbox_connections set
      tls = coalesce(p_tls, true), folders = normalised_folders, enabled = p_enabled,
      status = 'disconnected', last_error = null, updated_at = now()
    where id = existing.id returning * into result;
  else
    secret_id := vault.create_secret(trim(p_app_password),
      'torrance:' || actor_id::text || ':imap:' || lower(trim(p_account_email)),
      'Per-user IMAP app password');
    insert into public.imap_mailbox_connections (
      user_id, account_email, host, port, tls, folders, app_password_secret_id, enabled
    ) values (
      actor_id, lower(trim(p_account_email)), lower(trim(p_host)), p_port,
      coalesce(p_tls, true), normalised_folders, secret_id, p_enabled
    ) returning * into result;
  end if;
  insert into public.audit_events (action, actor_user_id, entity_id, entity_type, new_values, source)
  values ('update', actor_id, result.id, 'imap_mailbox_connection',
    jsonb_build_object('account_email', result.account_email, 'host', result.host, 'enabled', result.enabled),
    'application.imap_connection');
  return result;
end;
$$;

create or replace function public.disconnect_my_imap_mailbox_connection(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.imap_mailbox_connections;
begin
  if not public.is_active_staff() or actor_id is null then raise exception 'Approved staff access is required' using errcode = '42501'; end if;
  select * into target from public.imap_mailbox_connections where id = p_connection_id and user_id = actor_id for update;
  if not found then raise exception 'Mailbox connection not found' using errcode = 'P0002'; end if;
  delete from vault.secrets where id = target.app_password_secret_id;
  delete from public.imap_mailbox_connections where id = target.id;
  insert into public.audit_events (action, actor_user_id, entity_id, entity_type, source)
  values ('delete', actor_id, target.id, 'imap_mailbox_connection', 'application.imap_connection');
  return true;
end;
$$;

create or replace function public.get_enabled_imap_mailbox_credentials()
returns table (
  connection_id uuid, user_id uuid, account_email text, host text, port integer,
  tls boolean, folders text[], app_password text, last_uid_validity text, last_uid bigint
)
language sql
security definer
set search_path = ''
as $$
  select connection.id, connection.user_id, connection.account_email, connection.host,
    connection.port, connection.tls, connection.folders, secret.decrypted_secret,
    connection.last_uid_validity, connection.last_uid
  from public.imap_mailbox_connections connection
  join vault.decrypted_secrets secret on secret.id = connection.app_password_secret_id
  join public.profiles profile on profile.id = connection.user_id
  where connection.enabled and profile.active and profile.access_approved_at is not null;
$$;

create or replace function public.complete_imap_reconciliation(
  p_connection_id uuid, p_folder text, p_uid_validity text, p_last_uid bigint, p_synced_at timestamptz
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.imap_mailbox_folder_sync_states (connection_id, folder, last_uid_validity, last_uid, last_synced_at)
  values (p_connection_id, trim(p_folder), p_uid_validity, p_last_uid, p_synced_at)
  on conflict (connection_id, folder) do update set last_uid_validity = excluded.last_uid_validity,
    last_uid = excluded.last_uid, last_synced_at = excluded.last_synced_at;
  update public.imap_mailbox_connections set last_uid_validity = p_uid_validity,
    last_uid = p_last_uid, last_synced_at = p_synced_at, last_success_at = p_synced_at,
    last_error = null, status = 'connected', updated_at = now()
  where id = p_connection_id;
  return found;
end;
$$;

create or replace function public.fail_imap_reconciliation(p_connection_id uuid, p_error text, p_failed_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.imap_mailbox_connections set last_failure_at = p_failed_at,
    last_error = left(coalesce(p_error, 'IMAP reconciliation failed.'), 500),
    status = case when lower(coalesce(p_error, '')) like '%authentication%' then 'reauthentication_required' else 'error' end,
    updated_at = now() where id = p_connection_id;
  return found;
end;
$$;

create or replace function public.ingest_imap_message_for_owner(
  p_owner_user_id uuid, p_provider_event_id text, p_provider_message_id text,
  p_provider_thread_id text, p_internet_message_id text, p_received_at timestamptz,
  p_sender_name text, p_sender_email text, p_recipient_emails text[], p_cc_emails text[],
  p_subject text, p_snippet text, p_body_text text, p_folder_flags text[],
  p_has_attachments boolean, p_has_list_unsubscribe boolean, p_has_list_id boolean,
  p_is_bulk boolean, p_attachments jsonb default '[]'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  thread_id uuid;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted ingestion service required' using errcode = '42501';
  end if;
  if p_owner_user_id is null then raise exception 'An email mailbox owner is required' using errcode = '22023'; end if;
  perform set_config('app.email_owner_user_id', p_owner_user_id::text, true);
  result_id := public.ingest_gmail_message(
    'imap:' || trim(p_provider_event_id), 'imap:' || trim(p_provider_message_id),
    'imap:' || trim(p_provider_thread_id), p_internet_message_id, p_received_at,
    p_sender_name, p_sender_email, p_recipient_emails, p_cc_emails, p_subject,
    p_snippet, p_body_text, coalesce(p_folder_flags, '{}'::text[]), p_has_attachments,
    p_has_list_unsubscribe, p_has_list_id, p_is_bulk, p_attachments
  );
  select message.thread_id into thread_id from public.email_messages message where message.id = result_id;
  perform set_config('app.phase9_command', 'yes', true);
  update public.email_threads set provider = 'imap' where id = thread_id;
  update public.email_messages set provider = 'imap' where id = result_id;
  perform set_config('app.phase9_command', '', true);
  perform set_config('app.email_owner_user_id', '', true);
  return result_id;
exception when others then
  perform set_config('app.phase9_command', '', true);
  perform set_config('app.email_owner_user_id', '', true);
  raise;
end;
$$;

revoke all on function public.save_my_imap_mailbox_connection(text, text, integer, boolean, text[], text, boolean) from public, anon;
revoke all on function public.disconnect_my_imap_mailbox_connection(uuid) from public, anon;
grant execute on function public.save_my_imap_mailbox_connection(text, text, integer, boolean, text[], text, boolean) to authenticated;
grant execute on function public.disconnect_my_imap_mailbox_connection(uuid) to authenticated;
revoke all on function public.get_enabled_imap_mailbox_credentials() from public, anon, authenticated;
revoke all on function public.complete_imap_reconciliation(uuid, text, text, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_imap_reconciliation(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.ingest_imap_message_for_owner(uuid, text, text, text, text, timestamptz, text, text, text[], text[], text, text, text, text[], boolean, boolean, boolean, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.get_enabled_imap_mailbox_credentials() to service_role;
grant execute on function public.complete_imap_reconciliation(uuid, text, text, bigint, timestamptz) to service_role;
grant execute on function public.fail_imap_reconciliation(uuid, text, timestamptz) to service_role;
grant execute on function public.ingest_imap_message_for_owner(uuid, text, text, text, text, timestamptz, text, text, text[], text[], text, text, text, text[], boolean, boolean, boolean, boolean, jsonb) to service_role;
