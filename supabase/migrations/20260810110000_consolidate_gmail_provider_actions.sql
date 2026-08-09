-- Gmail uses the administrator-selected, application-owned OAuth connection.
-- n8n schedules the dispatcher but never stores a second Gmail credential.

create or replace function public.queue_email_provider_actions()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued_count integer;
declare selected_user uuid;
begin
  select settings.user_id into selected_user
  from public.gmail_ingestion_settings settings
  where settings.singleton and settings.enabled;
  if selected_user is null then return 0; end if;
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id,
    credential_user_id, payload
  )
  select 'gmail',
    case action.action_type when 'mark_read' then 'gmail_mark_read'::public.integration_operation
      else 'gmail_archive'::public.integration_operation end,
    'email_action:' || action.id::text, 'email_provider_action', action.id,
    selected_user,
    jsonb_build_object('provider_message_id', message.provider_message_id,
      'action_type', action.action_type)
  from public.email_provider_actions action
  join public.email_messages message on message.id = action.message_id
  where action.status in ('pending', 'failed')
  on conflict (idempotency_key) do update
    set credential_user_id = excluded.credential_user_id,
        payload = excluded.payload,
        updated_at = now()
    where public.integration_deliveries.status in ('pending', 'failed');
  get diagnostics queued_count = row_count;
  perform set_config('app.phase11_command', '', true);
  return queued_count;
end;
$$;

create or replace function public.get_delivery_oauth_credentials(p_delivery_id uuid)
returns table (account_email text, client_id text, client_secret text, refresh_token text)
language sql security definer set search_path = '' as $$
  select connection.account_email, client_id.decrypted_secret,
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

create or replace function public.claim_internal_alert_deliveries(
  p_worker_id text, p_limit integer default 20
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
  return query with claimable as (
    select id from public.integration_deliveries
    where operation in ('telegram_send', 'gmail_send_internal', 'gmail_create_draft',
      'gmail_mark_read', 'gmail_archive')
      and ((status in ('pending', 'failed') and next_attempt_at <= now())
        or (status = 'claimed' and lease_expires_at <= now()))
    order by next_attempt_at, created_at for update skip locked limit p_limit
  )
  update public.integration_deliveries delivery
  set status = 'claimed', attempt_count = delivery.attempt_count + 1,
    claimed_by = trim(p_worker_id), claimed_at = now(),
    lease_expires_at = now() + interval '5 minutes', updated_at = now()
  from claimable where delivery.id = claimable.id returning delivery.*;
  perform set_config('app.phase11_command', '', true);
end;
$$;
