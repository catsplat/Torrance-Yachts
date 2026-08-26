-- A paired helper polls outward from a staff Mac.  The hosted application never
-- opens a connection to the Mac or its local Ollama service.
create table public.local_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.local_ai_agents(id) on delete restrict,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  analysis_kind text not null check (analysis_kind in ('email_triage', 'contract_extraction')),
  input_payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'completed', 'failed')),
  result_payload jsonb,
  provider_request_id text check (provider_request_id is null or char_length(provider_request_id) <= 200),
  input_tokens integer,
  output_tokens integer,
  error_message text check (error_message is null or char_length(error_message) <= 500),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (result_payload is not null))
);

create index local_ai_jobs_agent_claim_idx on public.local_ai_jobs (agent_id, status, created_at)
  where status in ('pending', 'claimed');

alter table public.local_ai_jobs enable row level security;
revoke all on public.local_ai_jobs from public, anon, authenticated;
grant select, insert, update on public.local_ai_jobs to service_role;

create or replace function public.claim_local_ai_job(p_agent_token text)
returns table (
  job_id uuid,
  analysis_kind text,
  input_payload jsonb,
  model text
)
language plpgsql security definer set search_path = '' as $$
declare agent public.local_ai_agents;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted helper gateway required' using errcode = '42501';
  end if;
  select * into agent from public.local_ai_agents
  where token_sha256 = encode(extensions.digest(trim(p_agent_token), 'sha256'), 'hex')
    and status = 'available'
    and last_seen_at >= now() - interval '5 minutes'
  for update;
  if not found then raise exception 'Paired helper is unavailable' using errcode = 'P0002'; end if;

  return query with candidate as (
    select id from public.local_ai_jobs
    where agent_id = agent.id
      and (status = 'pending' or (status = 'claimed' and lease_expires_at <= now()))
    order by created_at
    for update skip locked limit 1
  )
  update public.local_ai_jobs job
  set status = 'claimed', claimed_at = now(), lease_expires_at = now() + interval '90 seconds', updated_at = now()
  from candidate
  where job.id = candidate.id
  returning job.id, job.analysis_kind, job.input_payload, coalesce(agent.selected_model, 'qwen3:4b-instruct');
end;
$$;

create or replace function public.complete_local_ai_job(
  p_agent_token text,
  p_job_id uuid,
  p_result_payload jsonb,
  p_provider_request_id text default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare agent public.local_ai_agents;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted helper gateway required' using errcode = '42501';
  end if;
  select * into agent from public.local_ai_agents
  where token_sha256 = encode(extensions.digest(trim(p_agent_token), 'sha256'), 'hex') and status <> 'revoked';
  if not found then raise exception 'Paired helper is not recognised' using errcode = 'P0002'; end if;
  update public.local_ai_jobs set status = 'completed', result_payload = p_result_payload,
    provider_request_id = nullif(left(trim(coalesce(p_provider_request_id, '')), 200), ''),
    input_tokens = p_input_tokens, output_tokens = p_output_tokens, completed_at = now(), updated_at = now(),
    lease_expires_at = null
  where id = p_job_id and agent_id = agent.id and status = 'claimed' and lease_expires_at > now();
  if not found then raise exception 'Local AI job is not leased by this helper' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.fail_local_ai_job(p_agent_token text, p_job_id uuid, p_error_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare agent public.local_ai_agents;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted helper gateway required' using errcode = '42501';
  end if;
  select * into agent from public.local_ai_agents
  where token_sha256 = encode(extensions.digest(trim(p_agent_token), 'sha256'), 'hex') and status <> 'revoked';
  if not found then raise exception 'Paired helper is not recognised' using errcode = 'P0002'; end if;
  update public.local_ai_jobs set status = 'failed', error_message = left(coalesce(nullif(trim(p_error_message), ''), 'Local analysis failed'), 500), updated_at = now(), lease_expires_at = null
  where id = p_job_id and agent_id = agent.id and status = 'claimed';
  if not found then raise exception 'Local AI job is not leased by this helper' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.claim_local_ai_job(text) from public, anon, authenticated;
revoke all on function public.complete_local_ai_job(text,uuid,jsonb,text,integer,integer) from public, anon, authenticated;
revoke all on function public.fail_local_ai_job(text,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_local_ai_job(text) to service_role;
grant execute on function public.complete_local_ai_job(text,uuid,jsonb,text,integer,integer) to service_role;
grant execute on function public.fail_local_ai_job(text,uuid,text) to service_role;
