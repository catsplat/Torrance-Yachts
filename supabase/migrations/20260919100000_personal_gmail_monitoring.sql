-- Preserve the former selection, but require each additional owner to opt in.
create table public.user_gmail_monitoring (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  enabled boolean not null default false,
  leased_until timestamptz,
  last_claimed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_gmail_monitoring enable row level security;
revoke all on public.user_gmail_monitoring from public, anon, authenticated;
grant select on public.user_gmail_monitoring to authenticated;
grant all on public.user_gmail_monitoring to service_role;
create policy own_gmail_monitoring on public.user_gmail_monitoring for select to authenticated
using (user_id = (select auth.uid()) and public.is_active_staff());
insert into public.user_gmail_monitoring(user_id, enabled)
select user_id, enabled from public.gmail_ingestion_settings where user_id is not null;

create or replace function public.configure_gmail_ingestion(p_user_id uuid, p_enabled boolean)
returns public.gmail_ingestion_settings
language plpgsql security definer set search_path = '' as $$
declare account text; result public.gmail_ingestion_settings;
begin
  if not public.is_active_staff() or p_user_id is distinct from auth.uid() then
    raise exception 'Only the mailbox owner may change monitoring' using errcode = '42501';
  end if;
  select account_email into account from public.user_oauth_connections
  where user_id = auth.uid() and provider = 'gmail' and status = 'connected'
    and scopes @> array['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.modify']::text[];
  if p_enabled and account is null then raise exception 'Connect your Gmail account first' using errcode = '23514'; end if;
  insert into public.user_gmail_monitoring(user_id, enabled) values(auth.uid(), p_enabled)
  on conflict(user_id) do update set enabled = excluded.enabled, updated_at = now();
  if p_enabled then
    perform set_config('app.phase11_command', 'yes', true);
    insert into public.gmail_reconciliation_states(user_id, account_email) values(auth.uid(), account)
    on conflict(user_id) do update set account_email = excluded.account_email,
      last_history_id = case when public.gmail_reconciliation_states.account_email = excluded.account_email then public.gmail_reconciliation_states.last_history_id else null end,
      updated_at = now();
    perform set_config('app.phase11_command', '', true);
  end if;
  -- Keep the old RPC return shape, without changing the legacy singleton.
  result.singleton := true; result.enabled := p_enabled; result.user_id := auth.uid();
  result.updated_by := auth.uid(); result.updated_at := now();
  return result;
end;
$$;

create or replace function public.list_google_mailbox_candidates()
returns table(user_id uuid, display_name text, account_email text, selected boolean, ingestion_enabled boolean, last_success_at timestamptz, last_failure_at timestamptz, last_error text)
language sql security definer set search_path = '' as $$
  select p.id, p.display_name, c.account_email, coalesce(m.enabled,false), coalesce(m.enabled,false), s.last_success_at, s.last_failure_at, s.last_error
  from public.profiles p join public.user_oauth_connections c on c.user_id=p.id and c.provider='gmail' and c.status='connected'
  left join public.user_gmail_monitoring m on m.user_id=p.id
  left join public.gmail_reconciliation_states s on s.user_id=p.id
  where p.id=auth.uid() and public.is_active_staff();
$$;

create or replace function public.get_active_gmail_ingestion_credentials()
returns table(user_id uuid, account_email text, client_id text, client_secret text, refresh_token text, scopes text[], last_history_id text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with candidates as (
    select m.user_id from public.user_gmail_monitoring m
    join public.profiles p on p.id=m.user_id and p.active and p.access_approved_at is not null
    join public.user_oauth_connections c on c.user_id=m.user_id and c.provider='gmail' and c.status='connected'
    where m.enabled and (m.leased_until is null or m.leased_until <= now())
    order by m.last_claimed_at nulls first, m.user_id
    limit 2 for update of m skip locked
  ), claimed as (
    update public.user_gmail_monitoring m set leased_until=now()+interval '5 minutes', last_claimed_at=now()
    from candidates c where c.user_id=m.user_id returning m.user_id
  )
  select c.user_id, c.account_email, ci.decrypted_secret, cs.decrypted_secret, rt.decrypted_secret, c.scopes, s.last_history_id
  from claimed join public.user_oauth_connections c on c.user_id=claimed.user_id and c.provider='gmail'
  join vault.decrypted_secrets ci on ci.id=c.client_id_secret_id
  join vault.decrypted_secrets cs on cs.id=c.client_secret_secret_id
  join vault.decrypted_secrets rt on rt.id=c.refresh_token_secret_id
  left join public.gmail_reconciliation_states s on s.user_id=c.user_id;
end;
$$;
revoke all on function public.get_active_gmail_ingestion_credentials() from public, anon, authenticated;
grant execute on function public.get_active_gmail_ingestion_credentials() to service_role;

create or replace function public.queue_email_provider_actions()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued_count integer;
begin
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries(provider,operation,idempotency_key,source_type,source_id,credential_user_id,payload)
  select 'gmail', case a.action_type when 'mark_read' then 'gmail_mark_read'::public.integration_operation else 'gmail_archive'::public.integration_operation end,
    'email_action:'||a.id::text,'email_provider_action',a.id,m.owner_user_id,
    jsonb_build_object('provider_message_id',m.provider_message_id,'action_type',a.action_type)
  from public.email_provider_actions a join public.email_messages m on m.id=a.message_id
  join public.profiles p on p.id=m.owner_user_id and p.active and p.access_approved_at is not null
  join public.user_oauth_connections c on c.user_id=m.owner_user_id and c.provider='gmail' and c.status='connected'
  where a.status in ('pending','failed') and m.provider='gmail'
  on conflict(idempotency_key) do update set credential_user_id=excluded.credential_user_id,payload=excluded.payload,updated_at=now()
    where public.integration_deliveries.status in ('pending','failed');
  get diagnostics queued_count = row_count;
  perform set_config('app.phase11_command', '', true);
  return queued_count;
end;
$$;
