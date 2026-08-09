-- Let one administrator-selected staff OAuth connection supply the shared
-- Calendar, Drive and Sheets adapters. PostgreSQL owns the selection while
-- provider credentials remain encrypted in Vault and service-role only.

create table public.google_workspace_dispatch_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  user_id uuid references public.profiles (id) on delete restrict,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint google_workspace_dispatch_enabled_user
    check (not enabled or user_id is not null)
);

insert into public.google_workspace_dispatch_settings (singleton) values (true);

create trigger guard_google_workspace_dispatch_settings
  before insert or update or delete on public.google_workspace_dispatch_settings
  for each row execute function public.guard_phase11_direct_mutation();

alter table public.google_workspace_dispatch_settings enable row level security;
revoke all on public.google_workspace_dispatch_settings from public, anon, authenticated;
grant select, insert, update on public.google_workspace_dispatch_settings to service_role;

create or replace function public.list_google_workspace_dispatch_candidates()
returns table (
  user_id uuid,
  display_name text,
  account_email text,
  selected boolean,
  dispatch_enabled boolean,
  scopes text[]
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
    connection.scopes
  from public.profiles profile
  join public.user_oauth_connections connection
    on connection.user_id = profile.id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
  cross join public.google_workspace_dispatch_settings settings
  where profile.active
  order by profile.display_name, connection.account_email;
end;
$$;

create or replace function public.configure_google_workspace_dispatch(
  p_user_id uuid,
  p_enabled boolean
)
returns public.google_workspace_dispatch_settings
language plpgsql security definer set search_path = '' as $$
declare
  configured public.google_workspace_dispatch_settings;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_enabled and not exists (
    select 1
    from public.user_oauth_connections connection
    join public.profiles profile on profile.id = connection.user_id and profile.active
    where connection.user_id = p_user_id
      and connection.provider = 'gmail'
      and connection.status = 'connected'
      and connection.scopes @> array[
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ]::text[]
  ) then
    raise exception 'Reconnect an active staff Google account with Calendar, Drive and Sheets access'
      using errcode = '23514';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  update public.google_workspace_dispatch_settings
  set enabled = p_enabled,
      user_id = case when p_enabled then p_user_id else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where singleton
  returning * into configured;
  perform set_config('app.phase11_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'GoogleWorkspaceDispatchConfigured',
    'profile',
    coalesce(p_user_id, (select auth.uid())),
    (select auth.uid()),
    jsonb_build_object('enabled', p_enabled)
  );
  return configured;
end;
$$;

create or replace function public.get_active_google_workspace_dispatch_credentials()
returns table (
  user_id uuid,
  account_email text,
  client_id text,
  client_secret text,
  refresh_token text,
  scopes text[]
)
language sql security definer set search_path = '' as $$
  select
    connection.user_id,
    connection.account_email,
    client_id.decrypted_secret,
    client_secret.decrypted_secret,
    refresh_token.decrypted_secret,
    connection.scopes
  from public.google_workspace_dispatch_settings settings
  join public.user_oauth_connections connection
    on connection.user_id = settings.user_id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
  join public.profiles profile on profile.id = connection.user_id and profile.active
  join vault.decrypted_secrets client_id on client_id.id = connection.client_id_secret_id
  join vault.decrypted_secrets client_secret on client_secret.id = connection.client_secret_secret_id
  join vault.decrypted_secrets refresh_token on refresh_token.id = connection.refresh_token_secret_id
  where settings.singleton and settings.enabled
    and current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

-- Include immutable operational IDs in the reporting mirror. References remain
-- human-readable labels, but Sheets rows are reconciled by internal identity.
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
        'id', enquiry.id,
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
        'id', booking.id,
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
        'id', assignment.id,
        'yacht_id', yacht.id,
        'contact_id', contact.id,
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

revoke all on function public.list_google_workspace_dispatch_candidates() from public, anon;
revoke all on function public.configure_google_workspace_dispatch(uuid, boolean) from public, anon;
revoke all on function public.get_active_google_workspace_dispatch_credentials()
  from public, anon, authenticated;
grant execute on function public.list_google_workspace_dispatch_candidates() to authenticated;
grant execute on function public.configure_google_workspace_dispatch(uuid, boolean) to authenticated;
grant execute on function public.get_active_google_workspace_dispatch_credentials() to service_role;
