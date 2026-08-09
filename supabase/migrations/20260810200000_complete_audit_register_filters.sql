create index if not exists audit_events_source_created_idx
  on public.audit_events (source, created_at desc, id desc);

drop function if exists public.list_audit_event_page(integer,timestamptz,bigint,uuid,text,text);
drop function if exists public.count_audit_events(uuid,text,text);

create function public.list_audit_event_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id bigint default null,
  p_actor_user_id uuid default null,
  p_entity_type text default null,
  p_action text default null,
  p_source text default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  id bigint, actor_user_id uuid, actor_name text, action text,
  entity_type text, entity_id uuid, old_values jsonb, new_values jsonb,
  source text, created_at timestamptz
)
language plpgsql stable security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Audit date range is invalid' using errcode = '22023';
  end if;
  return query select event.id, event.actor_user_id, profile.display_name,
    event.action, event.entity_type, event.entity_id,
    public.redact_audit_json(event.old_values),
    public.redact_audit_json(event.new_values),
    event.source, event.created_at
  from public.audit_events event
  left join public.profiles profile on profile.id = event.actor_user_id
  where (p_actor_user_id is null or event.actor_user_id = p_actor_user_id)
    and (p_entity_type is null or event.entity_type = p_entity_type)
    and (p_action is null or event.action = p_action)
    and (p_source is null or event.source = p_source)
    and (p_from is null or event.created_at >= p_from)
    and (p_to is null or event.created_at < p_to)
    and (p_cursor_created_at is null or event.created_at < p_cursor_created_at
      or (event.created_at = p_cursor_created_at and event.id < p_cursor_id))
  order by event.created_at desc, event.id desc limit clean_limit;
end;
$$;

create function public.count_audit_events(
  p_actor_user_id uuid default null,
  p_entity_type text default null,
  p_action text default null,
  p_source text default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns bigint language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Audit date range is invalid' using errcode = '22023';
  end if;
  return (select count(*) from public.audit_events event
    where (p_actor_user_id is null or event.actor_user_id = p_actor_user_id)
      and (p_entity_type is null or event.entity_type = p_entity_type)
      and (p_action is null or event.action = p_action)
      and (p_source is null or event.source = p_source)
      and (p_from is null or event.created_at >= p_from)
      and (p_to is null or event.created_at < p_to));
end;
$$;

revoke all on function public.list_audit_event_page(integer,timestamptz,bigint,uuid,text,text,text,timestamptz,timestamptz) from public, anon;
revoke all on function public.count_audit_events(uuid,text,text,text,timestamptz,timestamptz) from public, anon;
grant execute on function public.list_audit_event_page(integer,timestamptz,bigint,uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.count_audit_events(uuid,text,text,text,timestamptz,timestamptz) to authenticated;
