-- Allow one narrowly scoped provider worker to lease only operations it can
-- actually execute. This prevents a Gmail worker from temporarily hiding
-- Calendar, Drive, or Sheets work.

create or replace function public.claim_integration_deliveries_for_operations(
  p_worker_id text,
  p_limit integer,
  p_operations public.integration_operation[]
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
  if p_operations is null or cardinality(p_operations) < 1
    or cardinality(p_operations) > 20
    or array_position(p_operations, null) is not null
  then
    raise exception 'At least one valid operation is required' using errcode = '22023';
  end if;

  perform set_config('app.phase11_command', 'yes', true);
  return query
  with claimable as (
    select delivery.id
    from public.integration_deliveries delivery
    where delivery.operation = any(p_operations)
      and (
        delivery.status in ('pending', 'failed') and delivery.next_attempt_at <= now()
        or delivery.status = 'claimed' and delivery.lease_expires_at <= now()
      )
    order by delivery.next_attempt_at, delivery.created_at
    for update skip locked
    limit p_limit
  )
  update public.integration_deliveries delivery
  set status = 'claimed',
      attempt_count = delivery.attempt_count + 1,
      claimed_by = trim(p_worker_id),
      claimed_at = now(),
      lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
  from claimable
  where delivery.id = claimable.id
  returning delivery.*;
  perform set_config('app.phase11_command', '', true);
end;
$$;

revoke all on function public.claim_integration_deliveries_for_operations(
  text,integer,public.integration_operation[]
) from public, anon, authenticated;
grant execute on function public.claim_integration_deliveries_for_operations(
  text,integer,public.integration_operation[]
) to service_role;
