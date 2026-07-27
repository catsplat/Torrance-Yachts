-- A rehearsal run is explicit and auditable. It is not a deployment mode and
-- never alters operational settings to make fictional data work.
create table public.rehearsal_runs (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) between 2 and 160),
  status text not null default 'active' check (status in ('active', 'reset')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  reset_by uuid references public.profiles (id) on delete restrict,
  reset_at timestamptz,
  reset_reason text check (
    reset_reason is null or char_length(trim(reset_reason)) between 2 and 1000
  ),
  record_counts jsonb not null default '{}'::jsonb,
  constraint rehearsal_run_reset_fields check (
    (status = 'active' and reset_by is null and reset_at is null and reset_reason is null)
    or (status = 'reset' and reset_by is not null and reset_at is not null and reset_reason is not null)
  )
);

create table public.rehearsal_run_records (
  rehearsal_run_id uuid not null references public.rehearsal_runs (id) on delete restrict,
  entity_type text not null check (
    entity_type in (
      'yacht', 'contact', 'email_thread', 'email_message', 'enquiry',
      'offer', 'booking', 'task', 'document', 'notification'
    )
  ),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (rehearsal_run_id, entity_type, entity_id)
);

create index rehearsal_run_records_entity_idx
  on public.rehearsal_run_records (entity_type, entity_id);

alter table public.rehearsal_runs enable row level security;
alter table public.rehearsal_run_records enable row level security;

create policy rehearsal_runs_administrator_select
  on public.rehearsal_runs for select to authenticated
  using (public.is_administrator());
create policy rehearsal_records_administrator_select
  on public.rehearsal_run_records for select to authenticated
  using (public.is_administrator());

create or replace function public.create_rehearsal_run(p_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  insert into public.rehearsal_runs (label, created_by)
  values (trim(p_label), auth.uid())
  returning id into run_id;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, new_values, source
  ) values (
    auth.uid(), 'insert', 'rehearsal_run', run_id,
    jsonb_build_object('label', trim(p_label), 'status', 'active'),
    'offline_rehearsal'
  );
  return run_id;
end;
$$;

create or replace function public.register_rehearsal_record(
  p_rehearsal_run_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rehearsal_runs
    where id = p_rehearsal_run_id and status = 'active'
  ) then
    raise exception 'Active rehearsal run not found' using errcode = 'P0002';
  end if;
  insert into public.rehearsal_run_records (rehearsal_run_id, entity_type, entity_id)
  values (p_rehearsal_run_id, p_entity_type, p_entity_id)
  on conflict do nothing;
end;
$$;

create or replace function public.create_rehearsal_fixture_yacht(p_rehearsal_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  yacht_id uuid;
  fixture_name text := 'DEMO M/Y Asteria ' || upper(left(p_rehearsal_run_id::text, 8));
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rehearsal_runs
    where id = p_rehearsal_run_id and status = 'active'
  ) then
    raise exception 'Active rehearsal run not found' using errcode = 'P0002';
  end if;

  insert into public.yachts (
    name, builder, length_metres, guest_capacity, status, notes, created_by, updated_by
  ) values (
    fixture_name, 'Fictional rehearsal builder', 43, 12, 'active',
    'Fictional rehearsal fixture. Never use for operations.', auth.uid(), auth.uid()
  ) returning id into yacht_id;
  perform public.register_rehearsal_record(p_rehearsal_run_id, 'yacht', yacht_id);
  return yacht_id;
end;
$$;

revoke all on public.rehearsal_runs, public.rehearsal_run_records from public, anon, authenticated;
grant select on public.rehearsal_runs, public.rehearsal_run_records to authenticated;
revoke all on function public.create_rehearsal_run(text) from public, anon;
revoke all on function public.register_rehearsal_record(uuid,text,uuid) from public, anon;
revoke all on function public.create_rehearsal_fixture_yacht(uuid) from public, anon;
grant execute on function public.create_rehearsal_run(text) to authenticated;
grant execute on function public.register_rehearsal_record(uuid,text,uuid) to authenticated;
grant execute on function public.create_rehearsal_fixture_yacht(uuid) to authenticated;
