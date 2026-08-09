create type public.ai_work_status as enum ('pending', 'claimed', 'completed', 'permanent_failure');

create table public.ai_work_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.email_messages(id) on delete restrict,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.ai_work_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  claimed_by text,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_work_claim_idx on public.ai_work_queue(status, next_attempt_at, created_at)
  where status in ('pending', 'claimed');
alter table public.ai_work_queue enable row level security;
revoke all on public.ai_work_queue from public, anon, authenticated;
grant select, insert, update on public.ai_work_queue to service_role;

create or replace function public.claim_ai_email_work(p_worker_id text, p_limit integer default 5)
returns table (work_id uuid, claimed_source_id uuid, owner_user_id uuid, attempt_count integer)
language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  if char_length(trim(p_worker_id)) < 2 or p_limit < 1 or p_limit > 20 then
    raise exception 'Invalid claim parameters' using errcode = '22023';
  end if;
  insert into public.ai_work_queue(source_id, owner_user_id)
  select message.id, owner.id
  from public.email_messages message
  cross join lateral (
    select profile.id from public.profiles profile
    where profile.active and profile.access_approved_at is not null
    order by (profile.role = 'administrator') desc, profile.created_at limit 1
  ) owner
  where message.classification = 'unclassified'
    and message.processing_status = 'review_required'
    and not exists (select 1 from public.ai_work_queue work where work.source_id = message.id)
    and not exists (select 1 from public.ai_runs run where run.source_type = 'email_message'
      and run.source_id = message.id and run.status = 'completed')
  order by message.received_at limit 100
  on conflict on constraint ai_work_queue_source_id_key do nothing;

  return query with candidates as (
    select id from public.ai_work_queue
    where (status = 'pending' and next_attempt_at <= now())
      or (status = 'claimed' and lease_expires_at <= now())
    order by next_attempt_at, created_at for update skip locked limit p_limit
  )
  update public.ai_work_queue work set status = 'claimed',
    attempt_count = least(work.attempt_count + 1, 5), claimed_by = trim(p_worker_id),
    claimed_at = now(), lease_expires_at = now() + interval '2 minutes', updated_at = now()
  from candidates where work.id = candidates.id
  returning work.id, work.source_id, work.owner_user_id, work.attempt_count;
end;
$$;

create or replace function public.complete_ai_email_work(p_work_id uuid, p_worker_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  update public.ai_work_queue set status = 'completed', completed_at = now(),
    claimed_by = null, claimed_at = null, lease_expires_at = null, last_error = null,
    updated_at = now()
  where id = p_work_id and status = 'claimed' and claimed_by = trim(p_worker_id);
  if not found then raise exception 'AI work lease is not owned by this worker' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.fail_ai_email_work(
  p_work_id uuid, p_worker_id text, p_error text, p_retryable boolean
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  update public.ai_work_queue set
    status = case
      when not p_retryable or attempt_count >= 5 then 'permanent_failure'::public.ai_work_status
      else 'pending'::public.ai_work_status
    end,
    next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, greatest(attempt_count - 1, 0))::integer)),
    claimed_by = null, claimed_at = null, lease_expires_at = null,
    last_error = left(coalesce(nullif(trim(p_error), ''), 'AI processing failed'), 500), updated_at = now()
  where id = p_work_id and status = 'claimed' and claimed_by = trim(p_worker_id);
  if not found then raise exception 'AI work lease is not owned by this worker' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.get_ai_queue_health()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'pending', count(*) filter (where status = 'pending'),
    'claimed', count(*) filter (where status = 'claimed'),
    'permanent_failure', count(*) filter (where status = 'permanent_failure'),
    'oldest_pending_at', min(created_at) filter (where status in ('pending','claimed'))
  ) from public.ai_work_queue
  where current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_administrator();
$$;

revoke all on function public.claim_ai_email_work(text,integer) from public, anon, authenticated;
revoke all on function public.complete_ai_email_work(uuid,text) from public, anon, authenticated;
revoke all on function public.fail_ai_email_work(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.get_ai_queue_health() from public, anon;
grant execute on function public.claim_ai_email_work(text,integer) to service_role;
grant execute on function public.complete_ai_email_work(uuid,text) to service_role;
grant execute on function public.fail_ai_email_work(uuid,text,text,boolean) to service_role;
grant execute on function public.get_ai_queue_health() to authenticated, service_role;
