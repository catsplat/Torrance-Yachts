-- A paired helper is an outbound client: the VPS stores only a hash of its
-- bearer credential and never opens a port to an employee MacBook.

create table public.local_ai_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_name text not null check (char_length(trim(device_name)) between 2 and 120),
  token_sha256 text not null unique check (token_sha256 ~ '^[0-9a-f]{64}$'),
  selected_model text check (selected_model is null or char_length(selected_model) between 1 and 128),
  status text not null default 'paired' check (status in ('paired','available','offline','revoked')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.local_ai_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_sha256 text not null unique check (code_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index local_ai_agents_user_status_idx on public.local_ai_agents (user_id, status);
alter table public.local_ai_agents enable row level security;
alter table public.local_ai_pairing_codes enable row level security;
create policy "Users view their paired local AI helpers" on public.local_ai_agents
  for select to authenticated using ((select public.is_active_staff()) and user_id = (select auth.uid()));

create or replace function public.create_my_local_ai_pairing_code()
returns table (pairing_code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); raw_code text; expiry timestamptz := now() + interval '10 minutes';
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  delete from public.local_ai_pairing_codes where user_id = actor_id and consumed_at is null;
  raw_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
  insert into public.local_ai_pairing_codes (user_id, code_sha256, expires_at)
  values (actor_id, encode(extensions.digest(raw_code, 'sha256'), 'hex'), expiry);
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, new_values, source)
  values (actor_id, 'insert', 'local_ai_pairing', gen_random_uuid(), jsonb_build_object('expires_at', expiry), 'application');
  return query select raw_code, expiry;
end;
$$;

create or replace function public.redeem_local_ai_pairing_code(p_pairing_code text, p_device_name text)
returns table (agent_id uuid, agent_token text, owner_user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare code_record public.local_ai_pairing_codes; raw_token text; new_agent uuid;
begin
  select * into code_record from public.local_ai_pairing_codes
  where code_sha256 = encode(extensions.digest(upper(trim(p_pairing_code)), 'sha256'), 'hex')
  for update;
  if not found or code_record.consumed_at is not null or code_record.expires_at <= now() then raise exception 'Pairing code is invalid or expired' using errcode = '22023'; end if;
  if char_length(trim(p_device_name)) not between 2 and 120 then raise exception 'A device name is required' using errcode = '22023'; end if;
  raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.local_ai_agents (user_id, device_name, token_sha256)
  values (code_record.user_id, trim(p_device_name), encode(extensions.digest(raw_token, 'sha256'), 'hex')) returning id into new_agent;
  update public.local_ai_pairing_codes set consumed_at = now() where id = code_record.id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, new_values, source)
  values (code_record.user_id, 'insert', 'local_ai_agent', new_agent, jsonb_build_object('device_name', trim(p_device_name)), 'local-ai-helper');
  return query select new_agent, raw_token, code_record.user_id;
end;
$$;

create or replace function public.authenticate_local_ai_agent(p_agent_token text)
returns table (agent_id uuid, owner_user_id uuid, selected_model text, status text)
language sql stable security definer set search_path = '' as $$
  select id, user_id, selected_model, status from public.local_ai_agents
  where token_sha256 = encode(extensions.digest(trim(p_agent_token), 'sha256'), 'hex') and status <> 'revoked';
$$;

create or replace function public.report_local_ai_agent_status(p_agent_token text, p_status text, p_model text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare agent public.local_ai_agents;
begin
  if p_status not in ('available','offline') then raise exception 'Invalid helper status' using errcode = '22023'; end if;
  select * into agent from public.local_ai_agents where token_sha256 = encode(extensions.digest(trim(p_agent_token), 'sha256'), 'hex') and status <> 'revoked' for update;
  if not found then raise exception 'Helper token is invalid' using errcode = '42501'; end if;
  update public.local_ai_agents set status = p_status, selected_model = nullif(trim(p_model), ''), last_seen_at = now(), updated_at = now() where id = agent.id;
end;
$$;

revoke all on public.local_ai_agents, public.local_ai_pairing_codes from public, anon, authenticated;
grant select (id, user_id, device_name, selected_model, status, last_seen_at, created_at, updated_at) on public.local_ai_agents to authenticated;
revoke all on function public.create_my_local_ai_pairing_code(), public.redeem_local_ai_pairing_code(text,text), public.authenticate_local_ai_agent(text), public.report_local_ai_agent_status(text,text,text) from public, anon, authenticated;
grant execute on function public.create_my_local_ai_pairing_code() to authenticated;
grant execute on function public.redeem_local_ai_pairing_code(text,text) to service_role;
grant execute on function public.authenticate_local_ai_agent(text) to service_role;
grant execute on function public.report_local_ai_agent_status(text,text,text) to service_role;
