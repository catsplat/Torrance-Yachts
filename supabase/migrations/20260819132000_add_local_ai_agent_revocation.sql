-- A lost or retired helper can be revoked by its owner without exposing its
-- bearer token or requiring an administrator to see another user's devices.

create or replace function public.revoke_my_local_ai_agent(p_agent_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.local_ai_agents;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  select * into target
  from public.local_ai_agents
  where id = p_agent_id and user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Local AI helper not found' using errcode = 'P0002';
  end if;

  if target.status <> 'revoked' then
    update public.local_ai_agents
    set status = 'revoked', updated_at = now()
    where id = target.id;
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, old_values, new_values, source)
    values ((select auth.uid()), 'update', 'local_ai_agent', target.id,
      jsonb_build_object('status', target.status), jsonb_build_object('status', 'revoked'), 'application');
  end if;
end;
$$;

revoke all on function public.revoke_my_local_ai_agent(uuid) from public, anon;
grant execute on function public.revoke_my_local_ai_agent(uuid) to authenticated;
