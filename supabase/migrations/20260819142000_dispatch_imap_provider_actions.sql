-- Gmail and IMAP mailbox actions must never share credentials. The existing
-- Gmail delivery queue therefore deliberately ignores IMAP records; this
-- adapter exposes only the owner-bound IMAP actions to the trusted worker.
create or replace function public.queue_email_provider_actions()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued_count integer; selected_user uuid;
begin
  select settings.user_id into selected_user from public.gmail_ingestion_settings settings
  where settings.singleton and settings.enabled;
  if selected_user is null then return 0; end if;
  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_deliveries (provider, operation, idempotency_key, source_type, source_id, credential_user_id, payload)
  select 'gmail', case action.action_type when 'mark_read' then 'gmail_mark_read'::public.integration_operation else 'gmail_archive'::public.integration_operation end,
    'email_action:' || action.id::text, 'email_provider_action', action.id, selected_user,
    jsonb_build_object('provider_message_id', message.provider_message_id, 'action_type', action.action_type)
  from public.email_provider_actions action
  join public.email_messages message on message.id = action.message_id
  where action.status in ('pending', 'failed') and message.provider = 'gmail'
  on conflict (idempotency_key) do update set credential_user_id = excluded.credential_user_id, payload = excluded.payload, updated_at = now()
    where public.integration_deliveries.status in ('pending', 'failed');
  get diagnostics queued_count = row_count;
  perform set_config('app.phase11_command', '', true);
  return queued_count;
end;
$$;

create or replace function public.get_pending_imap_provider_actions()
returns table (
  action_id uuid, action_type public.email_provider_action_type, account_email text,
  app_password text, connection_id uuid, folder text, host text, port integer,
  tls boolean, uid bigint
)
language sql security definer set search_path = '' as $$
  select action.id, action.action_type, connection.account_email, secret.decrypted_secret,
    connection.id, coalesce(message.gmail_label_ids[1], 'INBOX'), connection.host,
    connection.port, connection.tls,
    regexp_replace(message.provider_message_id, '^.*:', '')::bigint
  from public.email_provider_actions action
  join public.email_messages message on message.id = action.message_id and message.provider = 'imap'
  join public.email_threads thread on thread.id = message.thread_id
  join public.imap_mailbox_connections connection
    on thread.provider_thread_id like ('imap:' || connection.id::text || ':%')
    and connection.enabled and connection.user_id = thread.owner_user_id
  join vault.decrypted_secrets secret on secret.id = connection.app_password_secret_id
  join public.profiles owner on owner.id = connection.user_id and owner.active and owner.access_approved_at is not null
  where current_user in ('service_role', 'postgres', 'supabase_admin')
    and action.status in ('pending', 'failed')
  order by action.created_at
  limit 25;
$$;

create or replace function public.complete_imap_provider_action(p_action_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then raise exception 'Trusted automation service required' using errcode = '42501'; end if;
  perform set_config('app.phase9_command', 'yes', true);
  update public.email_provider_actions set status = 'completed', completed_at = now(), last_error = null, updated_at = now()
  where id = p_action_id and status in ('pending', 'failed');
  perform set_config('app.phase9_command', '', true);
  return found;
end;
$$;

create or replace function public.fail_imap_provider_action(p_action_id uuid, p_error text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then raise exception 'Trusted automation service required' using errcode = '42501'; end if;
  perform set_config('app.phase9_command', 'yes', true);
  update public.email_provider_actions set status = 'failed', attempt_count = least(attempt_count + 1, 100), last_error = left(coalesce(nullif(trim(p_error), ''), 'IMAP mailbox action failed.'), 2000), updated_at = now()
  where id = p_action_id and status in ('pending', 'failed');
  perform set_config('app.phase9_command', '', true);
  return found;
end;
$$;

revoke all on function public.get_pending_imap_provider_actions(), public.complete_imap_provider_action(uuid), public.fail_imap_provider_action(uuid,text) from public, anon, authenticated;
grant execute on function public.get_pending_imap_provider_actions(), public.complete_imap_provider_action(uuid), public.fail_imap_provider_action(uuid,text) to service_role;
