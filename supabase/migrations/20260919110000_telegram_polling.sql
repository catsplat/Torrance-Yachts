-- No messages or bot credentials are stored here; only delivery position/health.
create table public.telegram_poll_state (
  bot_key text primary key check (bot_key ~ '^[a-f0-9]{64}$'),
  next_offset bigint not null default 0 check (next_offset >= 0),
  lease_id uuid,
  leased_until timestamptz,
  last_success_at timestamptz,
  last_error text
);
alter table public.telegram_poll_state enable row level security;
revoke all on public.telegram_poll_state from public, anon, authenticated;
grant all on public.telegram_poll_state to service_role;

create function public.claim_telegram_poll(p_bot_key text)
returns table(lease_id uuid, next_offset bigint)
language plpgsql security definer set search_path='' as $$
begin
  insert into public.telegram_poll_state(bot_key) values(p_bot_key) on conflict do nothing;
  return query update public.telegram_poll_state s
    set lease_id=gen_random_uuid(), leased_until=now()+interval '45 seconds'
    where s.bot_key=p_bot_key and (s.leased_until is null or s.leased_until<=now())
    returning s.lease_id,s.next_offset;
end;
$$;
create function public.finish_telegram_poll(p_bot_key text,p_lease_id uuid,p_next_offset bigint,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.telegram_poll_state s set next_offset=greatest(s.next_offset,p_next_offset),
    lease_id=null,leased_until=null,last_error=left(p_error,200),
    last_success_at=case when p_error is null then now() else s.last_success_at end
  where s.bot_key=p_bot_key and s.lease_id=p_lease_id and s.leased_until>now() and p_next_offset>=0;
  return found;
end;
$$;
revoke all on function public.claim_telegram_poll(text) from public,anon,authenticated;
revoke all on function public.finish_telegram_poll(text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.claim_telegram_poll(text) to service_role;
grant execute on function public.finish_telegram_poll(text,uuid,bigint,text) to service_role;
