-- Bounded, jittered retries avoid synchronised provider retry storms. Permanent
-- failures remain visible until an administrator deliberately retries them.
create or replace function public.fail_integration_delivery(
  p_delivery_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  delivery_record public.integration_deliveries;
  retry_at timestamptz;
  retry_seconds integer;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  select * into delivery_record from public.integration_deliveries
  where id = p_delivery_id and status = 'claimed' and claimed_by = trim(p_worker_id)
  for update;
  if not found then raise exception 'Active delivery claim not found' using errcode = 'P0002'; end if;

  retry_seconds := least(
    3600,
    power(2, greatest(0, delivery_record.attempt_count - 1))::integer * 60
      + floor(random() * 30)::integer
  );
  retry_at := case when p_retryable and delivery_record.attempt_count < 8
    then now() + make_interval(secs => retry_seconds)
    else 'infinity'::timestamptz end;

  perform set_config('app.phase11_command', 'yes', true);
  update public.integration_deliveries
  set status = 'failed',
      next_attempt_at = retry_at,
      claimed_by = null, claimed_at = null, lease_expires_at = null,
      last_error_code = left(trim(p_error_code), 120),
      last_error_message = left(trim(p_error_message), 2000),
      updated_at = now()
  where id = p_delivery_id;
  update public.integration_connections
  set last_failure_at = now(), last_error = left(trim(p_error_message), 2000),
      updated_at = now()
  where provider = delivery_record.provider;
  if delivery_record.source_type = 'notification' then
    update public.notifications set status = 'failed', updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'email_provider_action' then
    perform set_config('app.phase9_command', 'yes', true);
    update public.email_provider_actions
    set status = 'failed', attempt_count = attempt_count + 1,
        last_error = left(trim(p_error_message), 2000), updated_at = now()
    where id = delivery_record.source_id;
    perform set_config('app.phase9_command', '', true);
  elsif delivery_record.source_type = 'calendar_event' then
    update public.calendar_events set sync_status = 'failed', updated_at = now()
    where id = delivery_record.source_id;
  elsif delivery_record.source_type = 'integration_snapshot' then
    update public.integration_snapshots set status = 'failed'
    where id = delivery_record.source_id;
  end if;
  perform set_config('app.phase11_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, payload
  ) values (
    'IntegrationDeliveryFailed', 'integration_delivery', p_delivery_id,
    jsonb_build_object(
      'provider', delivery_record.provider,
      'operation', delivery_record.operation,
      'retryable', p_retryable,
      'error_code', left(trim(p_error_code), 120),
      'retry_at', retry_at
    )
  );
end;
$$;

create or replace function public.get_integration_queue_health()
returns table (
  pending_count bigint,
  claimed_count bigint,
  failed_count bigint,
  permanent_failure_count bigint,
  oldest_pending_at timestamptz,
  oldest_pending_age_seconds bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where status = 'pending') as pending_count,
    count(*) filter (where status = 'claimed') as claimed_count,
    count(*) filter (where status = 'failed') as failed_count,
    count(*) filter (where status = 'failed' and next_attempt_at = 'infinity'::timestamptz)
      as permanent_failure_count,
    min(created_at) filter (where status in ('pending', 'claimed', 'failed')) as oldest_pending_at,
    coalesce(extract(epoch from now() - min(created_at) filter (
      where status in ('pending', 'claimed', 'failed')
    ))::bigint, 0) as oldest_pending_age_seconds
  from public.integration_deliveries;
$$;

revoke all on function public.get_integration_queue_health() from public, anon;
grant execute on function public.get_integration_queue_health() to authenticated;
