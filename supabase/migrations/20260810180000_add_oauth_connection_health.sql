-- Record provider-side OAuth health without exposing tokens to application users.
-- A revoked Google grant becomes a visible reconnect state instead of an
-- indefinitely retrying delivery or inbox reconciliation failure.

create or replace function public.record_google_oauth_health(
  p_user_id uuid,
  p_succeeded boolean,
  p_requires_reauthentication boolean default false,
  p_error text default null,
  p_recorded_at timestamptz default now()
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted application service required' using errcode = '42501';
  end if;

  perform set_config('app.personal_alert_command', 'yes', true);
  update public.user_oauth_connections
  set status = case
        when p_succeeded then 'connected'::public.user_oauth_connection_status
        when p_requires_reauthentication then 'needs_reauthentication'::public.user_oauth_connection_status
        else status
      end,
      last_success_at = case when p_succeeded then p_recorded_at else last_success_at end,
      last_failure_at = case when p_succeeded then null else p_recorded_at end,
      last_error = case
        when p_succeeded then null
        else left(coalesce(nullif(trim(p_error), ''), 'Google provider request failed.'), 500)
      end,
      updated_at = p_recorded_at
  where user_id = p_user_id and provider = 'gmail';
  perform set_config('app.personal_alert_command', '', true);

  if not found then
    raise exception 'Google OAuth connection not found' using errcode = 'P0002';
  end if;

  if p_requires_reauthentication then
    insert into public.workflow_events (
      event_type, aggregate_type, aggregate_id, actor_user_id, payload
    ) values (
      'GoogleOAuthReconnectRequired', 'profile', p_user_id, null,
      jsonb_build_object('provider', 'gmail', 'recorded_at', p_recorded_at)
    );
  end if;
end;
$$;

drop function public.get_delivery_oauth_credentials(uuid);
create function public.get_delivery_oauth_credentials(p_delivery_id uuid)
returns table (
  user_id uuid,
  account_email text,
  client_id text,
  client_secret text,
  refresh_token text
)
language sql security definer set search_path = '' as $$
  select connection.user_id, connection.account_email, client_id.decrypted_secret,
    client_secret.decrypted_secret, refresh_token.decrypted_secret
  from public.integration_deliveries delivery
  join public.user_oauth_connections connection
    on connection.user_id = delivery.credential_user_id
    and connection.provider = 'gmail' and connection.status = 'connected'
  join public.profiles profile on profile.id = connection.user_id
    and profile.active and profile.access_approved_at is not null
  join vault.decrypted_secrets client_id on client_id.id = connection.client_id_secret_id
  join vault.decrypted_secrets client_secret on client_secret.id = connection.client_secret_secret_id
  join vault.decrypted_secrets refresh_token on refresh_token.id = connection.refresh_token_secret_id
  where current_user in ('service_role', 'postgres', 'supabase_admin')
    and delivery.id = p_delivery_id and delivery.status = 'claimed'
    and delivery.operation in (
      'gmail_send_internal', 'gmail_create_draft', 'gmail_mark_read', 'gmail_archive'
    );
$$;

revoke all on function public.get_delivery_oauth_credentials(uuid)
  from public, anon, authenticated;
grant execute on function public.get_delivery_oauth_credentials(uuid) to service_role;

revoke all on function public.record_google_oauth_health(uuid, boolean, boolean, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_google_oauth_health(uuid, boolean, boolean, text, timestamptz)
  to service_role;

-- Browser acceptance creates a reserved example.test identity through Auth and
-- promotes only that synthetic identity. This keeps disposable acceptance
-- accounts independent from developer or production administrators.
create or replace function public.prepare_synthetic_acceptance_administrator(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare account_email text;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted acceptance harness required' using errcode = '42501';
  end if;
  select email into account_email from public.profiles where id = p_user_id;
  if account_email is null or account_email !~ '@example\.test$' then
    raise exception 'Acceptance identities must use the reserved example.test domain'
      using errcode = '22023';
  end if;
  update public.profiles set active = true, role = 'administrator',
    access_approved_at = now(), access_approved_by = p_user_id
  where id = p_user_id;
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'SyntheticAcceptanceAdministratorPrepared','profile',p_user_id,null,
    jsonb_build_object('synthetic',true)
  );
end;
$$;
revoke all on function public.prepare_synthetic_acceptance_administrator(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_synthetic_acceptance_administrator(uuid) to service_role;
