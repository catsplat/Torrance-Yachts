create table public.upload_leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index upload_leases_user_expiry_idx on public.upload_leases(user_id, expires_at);
alter table public.upload_leases enable row level security;
revoke all on public.upload_leases from public, anon, authenticated;
grant select, insert, delete on public.upload_leases to service_role;

create table public.upload_byte_quotas (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null,
  consumed_bytes bigint not null check (consumed_bytes > 0)
);
alter table public.upload_byte_quotas enable row level security;
revoke all on public.upload_byte_quotas from public, anon, authenticated;
grant select, insert, update on public.upload_byte_quotas to service_role;

create or replace function public.claim_upload_capacity(
  p_user_id uuid,
  p_size_bytes bigint,
  p_max_concurrent integer default 2,
  p_max_bytes_per_hour bigint default 104857600
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare lease_id uuid;
declare quota public.upload_byte_quotas;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted application service required' using errcode = '42501';
  end if;
  if p_size_bytes < 1 or p_size_bytes > 20971520 or p_max_concurrent < 1
    or p_max_concurrent > 5 or p_max_bytes_per_hour < 20971520 then
    raise exception 'Invalid upload capacity request' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 68421));
  delete from public.upload_leases where expires_at <= now();
  if (select count(*) from public.upload_leases where user_id = p_user_id) >= p_max_concurrent then
    return null;
  end if;
  insert into public.upload_byte_quotas(user_id, window_started_at, consumed_bytes)
  values (p_user_id, now(), p_size_bytes)
  on conflict (user_id) do update set
    window_started_at = case when public.upload_byte_quotas.window_started_at <= now() - interval '1 hour'
      then now() else public.upload_byte_quotas.window_started_at end,
    consumed_bytes = case when public.upload_byte_quotas.window_started_at <= now() - interval '1 hour'
      then p_size_bytes else public.upload_byte_quotas.consumed_bytes + p_size_bytes end
  returning * into quota;
  if quota.consumed_bytes > p_max_bytes_per_hour then return null; end if;
  insert into public.upload_leases(user_id, expires_at)
  values (p_user_id, now() + interval '3 minutes') returning id into lease_id;
  return lease_id;
end;
$$;

create or replace function public.release_upload_capacity(p_lease_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted application service required' using errcode = '42501';
  end if;
  delete from public.upload_leases where id = p_lease_id;
  return found;
end;
$$;

revoke all on function public.claim_upload_capacity(uuid,bigint,integer,bigint) from public, anon, authenticated;
revoke all on function public.release_upload_capacity(uuid) from public, anon, authenticated;
grant execute on function public.claim_upload_capacity(uuid,bigint,integer,bigint) to service_role;
grant execute on function public.release_upload_capacity(uuid) to service_role;
