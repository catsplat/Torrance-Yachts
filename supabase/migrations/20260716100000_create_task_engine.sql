-- Phase 7: configurable booking task templates, dependencies, schedules, and audit.

create type public.task_template_status as enum ('draft', 'approved', 'retired');
create type public.task_status as enum ('blocked', 'ready', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.task_source as enum ('template', 'ad_hoc');
create type public.task_due_anchor as enum (
  'none',
  'booking_confirmed',
  'charter_start',
  'charter_end',
  'contract_payment_1',
  'contract_payment_2',
  'contract_payment_3'
);
create type public.task_external_action as enum ('none', 'yachtfolio_booking');

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null check (version_number > 0),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text check (
    description is null or char_length(trim(description)) between 2 and 3000
  ),
  status public.task_template_status not null default 'draft',
  is_default boolean not null default false,
  source_template_id uuid references public.task_templates (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version_number),
  constraint task_template_approval_fields check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  ),
  constraint task_template_default_approved check (
    not is_default or status = 'approved'
  )
);

create unique index task_templates_one_default_idx
  on public.task_templates ((is_default)) where is_default;
create index task_templates_status_idx
  on public.task_templates (status, updated_at desc);

create table public.task_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates (id) on delete cascade,
  step_code text not null check (step_code ~ '^[0-9]+([.][0-9A-Z]+)?$'),
  title text not null check (char_length(trim(title)) between 2 and 240),
  description text check (
    description is null or char_length(trim(description)) between 2 and 5000
  ),
  priority public.task_priority not null default 'normal',
  required boolean not null default true,
  due_anchor public.task_due_anchor not null default 'none',
  due_offset_days integer not null default 0 check (due_offset_days between -365 and 365),
  due_date_required boolean not null default false,
  reminder_lead_days smallint check (
    reminder_lead_days is null or reminder_lead_days between 0 and 365
  ),
  escalation_after_days smallint check (
    escalation_after_days is null or escalation_after_days between 0 and 365
  ),
  external_action public.task_external_action not null default 'none',
  auto_complete_on_generation boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, step_code),
  constraint task_template_step_due_requirement check (
    not due_date_required or due_anchor <> 'none'
  )
);

create index task_template_steps_template_idx
  on public.task_template_steps (template_id, sort_order, step_code);

create table public.task_template_step_dependencies (
  step_id uuid not null references public.task_template_steps (id) on delete cascade,
  depends_on_step_id uuid not null references public.task_template_steps (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (step_id, depends_on_step_id),
  constraint task_template_dependency_not_self check (step_id <> depends_on_step_id)
);

create sequence public.task_reference_sequence start with 1 increment by 1;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'TSK-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.task_reference_sequence')::text, 5, '0')
  ),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  template_id uuid references public.task_templates (id) on delete restrict,
  template_step_id uuid references public.task_template_steps (id) on delete restrict,
  source public.task_source not null,
  step_code text check (
    step_code is null or step_code ~ '^[0-9]+([.][0-9A-Z]+)?$'
  ),
  title text not null check (char_length(trim(title)) between 2 and 240),
  description text check (
    description is null or char_length(trim(description)) between 2 and 5000
  ),
  status public.task_status not null default 'blocked',
  priority public.task_priority not null default 'normal',
  required boolean not null default true,
  due_date date,
  due_anchor public.task_due_anchor not null default 'none',
  due_offset_days integer not null default 0 check (due_offset_days between -365 and 365),
  due_date_required boolean not null default false,
  reminder_lead_days smallint check (
    reminder_lead_days is null or reminder_lead_days between 0 and 365
  ),
  escalation_after_days smallint check (
    escalation_after_days is null or escalation_after_days between 0 and 365
  ),
  assigned_user_id uuid references public.profiles (id) on delete restrict,
  external_action public.task_external_action not null default 'none',
  blocked_reason text check (
    blocked_reason is null or char_length(trim(blocked_reason)) between 2 and 1000
  ),
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_source_fields check (
    (source = 'template' and template_id is not null and template_step_id is not null and step_code is not null)
    or (source = 'ad_hoc' and template_id is null and template_step_id is null)
  ),
  constraint task_completion_fields check (
    (status = 'completed' and completed_by is not null and completed_at is not null)
    or (status <> 'completed' and completed_by is null and completed_at is null)
  ),
  constraint task_cancellation_fields check (
    (status = 'cancelled' and cancelled_by is not null and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_by is null and cancelled_at is null)
  ),
  constraint task_due_requirement check (
    not due_date_required or due_anchor <> 'none'
  )
);

create unique index tasks_booking_template_step_idx
  on public.tasks (booking_id, template_step_id)
  where template_step_id is not null;
create index tasks_booking_status_idx
  on public.tasks (booking_id, status, due_date, priority);
create index tasks_assignee_status_idx
  on public.tasks (assigned_user_id, status, due_date);
create index tasks_due_idx
  on public.tasks (due_date, status) where status in ('blocked', 'ready');

create table public.task_dependencies (
  task_id uuid not null references public.tasks (id) on delete restrict,
  depends_on_task_id uuid not null references public.tasks (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependency_not_self check (task_id <> depends_on_task_id)
);

create index task_dependencies_parent_idx
  on public.task_dependencies (depends_on_task_id, task_id);

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete restrict,
  action text not null check (
    action in ('created', 'completed', 'reopened', 'rescheduled', 'assigned', 'priority_changed', 'cancelled')
  ),
  from_status public.task_status,
  to_status public.task_status,
  reason text not null check (char_length(trim(reason)) between 2 and 2000),
  changed_by uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_history_task_idx on public.task_history (task_id, created_at desc);

create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  body text not null check (char_length(trim(body)) between 2 and 10000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index task_notes_task_idx on public.task_notes (task_id, created_at desc);

alter table public.task_templates enable row level security;
alter table public.task_template_steps enable row level security;
alter table public.task_template_step_dependencies enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_history enable row level security;
alter table public.task_notes enable row level security;

create or replace function public.normalise_task_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'task_templates' then
    new.name := trim(new.name);
    new.description := nullif(trim(new.description), '');
  elsif tg_table_name = 'task_template_steps' then
    new.step_code := upper(trim(new.step_code));
    new.title := trim(new.title);
    new.description := nullif(trim(new.description), '');
  elsif tg_table_name = 'tasks' then
    new.step_code := nullif(upper(trim(new.step_code)), '');
    new.title := trim(new.title);
    new.description := nullif(trim(new.description), '');
    new.blocked_reason := nullif(trim(new.blocked_reason), '');
  elsif tg_table_name = 'task_notes' then
    new.body := trim(new.body);
  end if;
  return new;
end;
$$;

create or replace function public.guard_task_template_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT'
    and current_setting('app.task_template_create_authorised', true) is distinct from 'yes'
  then
    raise exception 'Task templates must be created through a controlled command'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if current_setting('app.task_template_update_authorised', true) is distinct from 'yes' then
      raise exception 'Task templates must be changed through a controlled command'
        using errcode = '42501';
    end if;
    new.id := old.id;
    new.version_number := old.version_number;
    new.source_template_id := old.source_template_id;
  end if;
  return new;
end;
$$;

create or replace function public.guard_task_template_step_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare template_status public.task_template_status;
begin
  if current_setting('app.task_template_step_authorised', true) is distinct from 'yes' then
    raise exception 'Task template steps must be changed through a controlled command'
      using errcode = '42501';
  end if;
  select status into template_status
  from public.task_templates
  where id = coalesce(new.template_id, old.template_id);
  if template_status <> 'draft' then
    raise exception 'Only draft task templates can be edited' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.guard_task_dependency_template()
returns trigger language plpgsql set search_path = '' as $$
declare step_template uuid; parent_template uuid; template_status public.task_template_status;
begin
  if current_setting('app.task_template_step_authorised', true) is distinct from 'yes' then
    raise exception 'Task template dependencies must be changed through a controlled command'
      using errcode = '42501';
  end if;
  select template_id into step_template from public.task_template_steps where id = new.step_id;
  select template_id into parent_template from public.task_template_steps where id = new.depends_on_step_id;
  select status into template_status from public.task_templates where id = step_template;
  if step_template is null or parent_template is null or step_template <> parent_template then
    raise exception 'Task dependencies must remain within one template' using errcode = '23514';
  end if;
  if template_status <> 'draft' then
    raise exception 'Only draft task templates can be edited' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_task_template_cycles()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    with recursive ancestors(id) as (
      select new.depends_on_step_id
      union
      select dependency.depends_on_step_id
      from public.task_template_step_dependencies dependency
      join ancestors on dependency.step_id = ancestors.id
    )
    select 1 from ancestors where id = new.step_id
  ) then
    raise exception 'Task template dependency would create a cycle'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.guard_task_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT'
    and current_setting('app.task_create_authorised', true) is distinct from 'yes'
  then
    raise exception 'Tasks must be created through a controlled command'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE'
    and current_setting('app.task_update_authorised', true) is distinct from 'yes'
  then
    raise exception 'Tasks must be changed through a controlled command'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.reference := old.reference;
    new.booking_id := old.booking_id;
    new.template_id := old.template_id;
    new.template_step_id := old.template_step_id;
    new.source := old.source;
    new.step_code := old.step_code;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_task_cycles()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    with recursive ancestors(id) as (
      select new.depends_on_task_id
      union
      select d.depends_on_task_id
      from public.task_dependencies d
      join ancestors a on d.task_id = a.id
    )
    select 1 from ancestors where id = new.task_id
  ) then
    raise exception 'Task dependency would create a cycle' using errcode = '23514';
  end if;
  if (select booking_id from public.tasks where id = new.task_id)
    is distinct from
    (select booking_id from public.tasks where id = new.depends_on_task_id)
  then
    raise exception 'Task dependencies must remain within one booking'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger normalise_task_template before insert or update on public.task_templates
  for each row execute function public.normalise_task_record();
create trigger guard_task_template before insert or update on public.task_templates
  for each row execute function public.guard_task_template_mutation();
create trigger set_task_template_audit before insert or update on public.task_templates
  for each row execute function public.set_directory_audit_fields();
create trigger audit_task_template after insert or update on public.task_templates
  for each row execute function public.audit_directory_change('task_template');

create trigger normalise_task_template_step before insert or update on public.task_template_steps
  for each row execute function public.normalise_task_record();
create trigger guard_task_template_step before insert or update or delete on public.task_template_steps
  for each row execute function public.guard_task_template_step_mutation();
create trigger set_task_template_step_audit before insert or update on public.task_template_steps
  for each row execute function public.set_directory_audit_fields();
create trigger audit_task_template_step after insert or update or delete on public.task_template_steps
  for each row execute function public.audit_directory_change('task_template_step');
create trigger guard_task_template_dependency before insert on public.task_template_step_dependencies
  for each row execute function public.guard_task_dependency_template();
create trigger prevent_task_template_dependency_cycle
  before insert on public.task_template_step_dependencies
  for each row execute function public.prevent_task_template_cycles();

create trigger normalise_task before insert or update on public.tasks
  for each row execute function public.normalise_task_record();
create trigger guard_task before insert or update on public.tasks
  for each row execute function public.guard_task_mutation();
create trigger set_task_audit before insert or update on public.tasks
  for each row execute function public.set_directory_audit_fields();
create trigger audit_task after insert or update on public.tasks
  for each row execute function public.audit_directory_change('task');
create trigger prevent_task_dependency_cycle before insert on public.task_dependencies
  for each row execute function public.prevent_task_cycles();
create trigger normalise_task_note before insert on public.task_notes
  for each row execute function public.normalise_task_record();

create or replace function public.calculate_template_task_due_date(
  p_anchor public.task_due_anchor,
  p_offset integer,
  p_booking public.bookings
)
returns date language sql immutable set search_path = '' as $$
  select case p_anchor
    when 'booking_confirmed' then p_booking.signed_agreement_confirmed_at::date + p_offset
    when 'charter_start' then p_booking.charter_start_date + p_offset
    when 'charter_end' then p_booking.charter_end_date + p_offset
    else null
  end;
$$;

create or replace function public.refresh_booking_task_states(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks t
  set
    status = case
      when t.due_date_required and t.due_date is null then 'blocked'::public.task_status
      when exists (
        select 1
        from public.task_dependencies d
        join public.tasks parent on parent.id = d.depends_on_task_id
        where d.task_id = t.id and parent.status <> 'completed'
      ) then 'blocked'::public.task_status
      else 'ready'::public.task_status
    end,
    blocked_reason = case
      when t.due_date_required and t.due_date is null
        then 'Waiting for reviewed contract schedule data'
      when exists (
        select 1
        from public.task_dependencies d
        join public.tasks parent on parent.id = d.depends_on_task_id
        where d.task_id = t.id and parent.status <> 'completed'
      ) then 'Waiting for prerequisite tasks'
      else null
    end
  where t.booking_id = p_booking_id
    and t.status in ('blocked', 'ready');
  perform set_config('app.task_update_authorised', '', true);
end;
$$;

create or replace function public.generate_booking_tasks(
  p_booking_id uuid,
  p_template_id uuid default null
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  booking_record public.bookings;
  selected_template public.task_templates;
  inserted_count integer;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  select * into booking_record from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  select * into selected_template
  from public.task_templates
  where status = 'approved'
    and (id = p_template_id or (p_template_id is null and is_default))
  order by is_default desc
  limit 1;
  if not found then
    raise exception 'An approved task template is required' using errcode = '23514';
  end if;

  perform set_config('app.task_create_authorised', 'yes', true);
  insert into public.tasks (
    booking_id, template_id, template_step_id, source, step_code, title,
    description, status, priority, required, due_date, due_anchor,
    due_offset_days, due_date_required, reminder_lead_days,
    escalation_after_days, external_action, blocked_reason,
    completed_by, completed_at
  )
  select
    booking_record.id, selected_template.id, s.id, 'template', s.step_code,
    s.title, s.description,
    case when s.auto_complete_on_generation then 'completed'::public.task_status
         else 'blocked'::public.task_status end,
    s.priority, s.required,
    public.calculate_template_task_due_date(s.due_anchor, s.due_offset_days, booking_record),
    s.due_anchor, s.due_offset_days, s.due_date_required,
    s.reminder_lead_days, s.escalation_after_days, s.external_action,
    case when s.auto_complete_on_generation then null
         else 'Waiting for task engine evaluation' end,
    case when s.auto_complete_on_generation then (select auth.uid()) else null end,
    case when s.auto_complete_on_generation then now() else null end
  from public.task_template_steps s
  where s.template_id = selected_template.id
  on conflict (booking_id, template_step_id) where template_step_id is not null do nothing;
  get diagnostics inserted_count = row_count;
  perform set_config('app.task_create_authorised', '', true);

  insert into public.task_dependencies (task_id, depends_on_task_id)
  select child.id, parent.id
  from public.task_template_step_dependencies d
  join public.tasks child
    on child.booking_id = booking_record.id and child.template_step_id = d.step_id
  join public.tasks parent
    on parent.booking_id = booking_record.id and parent.template_step_id = d.depends_on_step_id
  on conflict do nothing;

  insert into public.task_history (
    task_id, action, from_status, to_status, reason, changed_by
  )
  select t.id, 'created', null, t.status,
    case when t.status = 'completed'
      then 'Booking confirmation started the task sequence'
      else 'Generated from approved task template'
    end,
    (select auth.uid())
  from public.tasks t
  where t.booking_id = booking_record.id
    and t.template_id = selected_template.id
    and not exists (
      select 1 from public.task_history h where h.task_id = t.id and h.action = 'created'
    );

  perform public.refresh_booking_task_states(booking_record.id);
  if inserted_count > 0 then
    insert into public.workflow_events (
      event_type, aggregate_type, aggregate_id, actor_user_id, payload
    ) values (
      'BookingTasksGenerated', 'booking', booking_record.id, (select auth.uid()),
      jsonb_build_object(
        'template_id', selected_template.id,
        'template_version', selected_template.version_number,
        'task_count', inserted_count
      )
    );
  end if;
  return inserted_count;
end;
$$;

create or replace function public.complete_task(p_task_id uuid, p_reason text)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare target public.tasks; updated public.tasks; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A completion reason between 2 and 2000 characters is required' using errcode = '22023'; end if;
  select * into target from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found or not accessible' using errcode = 'P0002'; end if;
  if target.status <> 'ready' then raise exception 'Only a ready task can be completed' using errcode = '23514'; end if;
  if target.external_action = 'yachtfolio_booking'
    and not exists (
      select 1 from public.yachtfolio_booking_actions
      where booking_id = target.booking_id and status = 'completed'
    )
  then
    raise exception 'Complete the linked Yachtfolio action first' using errcode = '23514';
  end if;
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks set
    status = 'completed', blocked_reason = null,
    completed_by = (select auth.uid()), completed_at = now()
  where id = p_task_id returning * into updated;
  perform set_config('app.task_update_authorised', '', true);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
  values (p_task_id, 'completed', target.status, 'completed', clean_reason, (select auth.uid()));
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values ('TaskCompleted', 'task', p_task_id, (select auth.uid()), jsonb_build_object(
    'booking_id', target.booking_id, 'reference', target.reference, 'reason', clean_reason
  ));
  perform public.refresh_booking_task_states(target.booking_id);
  return updated;
end;
$$;

create or replace function public.reopen_task(p_task_id uuid, p_reason text)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare target public.tasks; updated public.tasks; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A reopening reason between 2 and 2000 characters is required' using errcode = '22023'; end if;
  select * into target from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found or not accessible' using errcode = 'P0002'; end if;
  if target.status <> 'completed' or (target.source = 'template' and target.step_code = '0.0') then
    raise exception 'This task cannot be reopened' using errcode = '23514';
  end if;
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks set status = 'blocked', completed_by = null, completed_at = null,
    blocked_reason = 'Reopened for review'
  where id = p_task_id returning * into updated;
  perform set_config('app.task_update_authorised', '', true);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
  values (p_task_id, 'reopened', target.status, 'blocked', clean_reason, (select auth.uid()));
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values ('TaskReopened', 'task', p_task_id, (select auth.uid()), jsonb_build_object(
    'booking_id', target.booking_id, 'reference', target.reference, 'reason', clean_reason
  ));
  perform public.refresh_booking_task_states(target.booking_id);
  select * into updated from public.tasks where id = p_task_id;
  return updated;
end;
$$;

create or replace function public.update_task_schedule(
  p_task_id uuid,
  p_due_date date,
  p_assigned_user_id uuid,
  p_priority public.task_priority,
  p_reason text
)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare target public.tasks; updated public.tasks; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A change reason between 2 and 2000 characters is required' using errcode = '22023'; end if;
  if p_assigned_user_id is not null and not exists (
    select 1 from public.profiles where id = p_assigned_user_id and active
  ) then raise exception 'Assignee must be an active internal user' using errcode = '23514'; end if;
  select * into target from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found or not accessible' using errcode = 'P0002'; end if;
  if target.status in ('completed', 'cancelled') then raise exception 'Completed or cancelled tasks cannot be rescheduled' using errcode = '23514'; end if;
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks set due_date = p_due_date, assigned_user_id = p_assigned_user_id,
    priority = p_priority
  where id = p_task_id returning * into updated;
  perform set_config('app.task_update_authorised', '', true);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by, metadata)
  values (
    p_task_id, 'rescheduled', target.status, target.status, clean_reason, (select auth.uid()),
    jsonb_build_object(
      'old_due_date', target.due_date, 'new_due_date', p_due_date,
      'old_assigned_user_id', target.assigned_user_id, 'new_assigned_user_id', p_assigned_user_id,
      'old_priority', target.priority, 'new_priority', p_priority
    )
  );
  perform public.refresh_booking_task_states(target.booking_id);
  select * into updated from public.tasks where id = p_task_id;
  return updated;
end;
$$;

create or replace function public.add_ad_hoc_task(
  p_booking_id uuid,
  p_title text,
  p_description text,
  p_due_date date,
  p_priority public.task_priority,
  p_assigned_user_id uuid
)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare created public.tasks; clean_title text := nullif(trim(p_title), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_title is null or char_length(clean_title) > 240 then raise exception 'A title between 2 and 240 characters is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.bookings where id = p_booking_id) then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  if p_assigned_user_id is not null and not exists (select 1 from public.profiles where id = p_assigned_user_id and active) then raise exception 'Assignee must be active' using errcode = '23514'; end if;
  perform set_config('app.task_create_authorised', 'yes', true);
  insert into public.tasks (
    booking_id, source, title, description, status, priority, required,
    due_date, assigned_user_id
  ) values (
    p_booking_id, 'ad_hoc', clean_title, p_description, 'ready', p_priority,
    false, p_due_date, p_assigned_user_id
  ) returning * into created;
  perform set_config('app.task_create_authorised', '', true);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
  values (created.id, 'created', null, 'ready', 'Ad-hoc task added', (select auth.uid()));
  return created;
end;
$$;

create or replace function public.cancel_ad_hoc_task(p_task_id uuid, p_reason text)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare target public.tasks; updated public.tasks; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A cancellation reason between 2 and 2000 characters is required' using errcode = '22023'; end if;
  select * into target from public.tasks where id = p_task_id and source = 'ad_hoc' for update;
  if not found then raise exception 'Only an ad-hoc task can be cancelled' using errcode = '23514'; end if;
  if target.status in ('completed', 'cancelled') then raise exception 'This task cannot be cancelled' using errcode = '23514'; end if;
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks set status = 'cancelled', blocked_reason = null,
    cancelled_by = (select auth.uid()), cancelled_at = now()
  where id = p_task_id returning * into updated;
  perform set_config('app.task_update_authorised', '', true);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
  values (p_task_id, 'cancelled', target.status, 'cancelled', clean_reason, (select auth.uid()));
  return updated;
end;
$$;

create or replace function public.add_task_note(p_task_id uuid, p_body text)
returns public.task_notes language plpgsql security definer set search_path = '' as $$
declare created public.task_notes; clean_body text := nullif(trim(p_body), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_body is null or char_length(clean_body) > 10000 then raise exception 'A note between 2 and 10000 characters is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.tasks where id = p_task_id) then raise exception 'Task not found or not accessible' using errcode = 'P0002'; end if;
  insert into public.task_notes (task_id, body, created_by)
  values (p_task_id, clean_body, (select auth.uid())) returning * into created;
  return created;
end;
$$;

create or replace function public.clone_task_template(
  p_source_template_id uuid,
  p_name text
)
returns public.task_templates language plpgsql security definer set search_path = '' as $$
declare source public.task_templates; created public.task_templates; next_version integer; clean_name text := nullif(trim(p_name), '');
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if clean_name is null or char_length(clean_name) > 160 then raise exception 'A template name is required' using errcode = '22023'; end if;
  select * into source from public.task_templates where id = p_source_template_id;
  if not found then raise exception 'Source template not found' using errcode = 'P0002'; end if;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.task_templates where name = clean_name;
  perform set_config('app.task_template_create_authorised', 'yes', true);
  insert into public.task_templates (version_number, name, description, source_template_id)
  values (next_version, clean_name, source.description, source.id)
  returning * into created;
  perform set_config('app.task_template_create_authorised', '', true);
  perform set_config('app.task_template_step_authorised', 'yes', true);
  insert into public.task_template_steps (
    id, template_id, step_code, title, description, priority, required,
    due_anchor, due_offset_days, due_date_required, reminder_lead_days,
    escalation_after_days, external_action, auto_complete_on_generation, sort_order
  )
  select gen_random_uuid(), created.id, step_code, title, description, priority,
    required, due_anchor, due_offset_days, due_date_required, reminder_lead_days,
    escalation_after_days, external_action, auto_complete_on_generation, sort_order
  from public.task_template_steps where template_id = source.id;
  insert into public.task_template_step_dependencies (step_id, depends_on_step_id)
  select new_child.id, new_parent.id
  from public.task_template_step_dependencies old_dependency
  join public.task_template_steps old_child on old_child.id = old_dependency.step_id
  join public.task_template_steps old_parent on old_parent.id = old_dependency.depends_on_step_id
  join public.task_template_steps new_child
    on new_child.template_id = created.id and new_child.step_code = old_child.step_code
  join public.task_template_steps new_parent
    on new_parent.template_id = created.id and new_parent.step_code = old_parent.step_code;
  perform set_config('app.task_template_step_authorised', '', true);
  return created;
end;
$$;

create or replace function public.update_task_template_step(
  p_step_id uuid,
  p_title text,
  p_description text,
  p_priority public.task_priority,
  p_required boolean,
  p_due_anchor public.task_due_anchor,
  p_due_offset_days integer,
  p_due_date_required boolean,
  p_reminder_lead_days smallint,
  p_escalation_after_days smallint
)
returns public.task_template_steps language plpgsql security definer set search_path = '' as $$
declare updated public.task_template_steps;
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  perform set_config('app.task_template_step_authorised', 'yes', true);
  update public.task_template_steps set
    title = p_title, description = p_description, priority = p_priority,
    required = p_required, due_anchor = p_due_anchor,
    due_offset_days = p_due_offset_days, due_date_required = p_due_date_required,
    reminder_lead_days = p_reminder_lead_days,
    escalation_after_days = p_escalation_after_days
  where id = p_step_id returning * into updated;
  perform set_config('app.task_template_step_authorised', '', true);
  if not found then raise exception 'Editable template step not found' using errcode = 'P0002'; end if;
  return updated;
end;
$$;

create or replace function public.add_task_template_step(
  p_template_id uuid,
  p_step_code text,
  p_title text,
  p_description text,
  p_priority public.task_priority,
  p_required boolean,
  p_due_anchor public.task_due_anchor,
  p_due_offset_days integer,
  p_due_date_required boolean,
  p_reminder_lead_days smallint,
  p_escalation_after_days smallint,
  p_sort_order integer
)
returns public.task_template_steps language plpgsql security definer set search_path = '' as $$
declare created public.task_template_steps;
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  perform set_config('app.task_template_step_authorised', 'yes', true);
  insert into public.task_template_steps (
    template_id, step_code, title, description, priority, required,
    due_anchor, due_offset_days, due_date_required, reminder_lead_days,
    escalation_after_days, sort_order
  ) values (
    p_template_id, p_step_code, p_title, p_description, p_priority, p_required,
    p_due_anchor, p_due_offset_days, p_due_date_required, p_reminder_lead_days,
    p_escalation_after_days, p_sort_order
  ) returning * into created;
  perform set_config('app.task_template_step_authorised', '', true);
  return created;
end;
$$;

create or replace function public.delete_task_template_step(p_step_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.task_template_steps; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 2000 then raise exception 'A deletion reason is required' using errcode = '22023'; end if;
  select * into target from public.task_template_steps where id = p_step_id;
  if not found then raise exception 'Editable template step not found' using errcode = 'P0002'; end if;
  if target.auto_complete_on_generation then raise exception 'The booking-confirmation milestone cannot be deleted' using errcode = '23514'; end if;
  perform set_config('app.task_template_step_authorised', 'yes', true);
  delete from public.task_template_steps where id = p_step_id;
  perform set_config('app.task_template_step_authorised', '', true);
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values ('TaskTemplateStepDeleted', 'task_template', target.template_id, (select auth.uid()),
    jsonb_build_object('step_code', target.step_code, 'title', target.title, 'reason', clean_reason));
end;
$$;

create or replace function public.replace_task_template_dependencies(
  p_step_id uuid,
  p_depends_on_step_ids uuid[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_template uuid; inserted_count integer;
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  select template_id into target_template from public.task_template_steps where id = p_step_id;
  if target_template is null then raise exception 'Template step not found' using errcode = 'P0002'; end if;
  perform set_config('app.task_template_step_authorised', 'yes', true);
  delete from public.task_template_step_dependencies where step_id = p_step_id;
  insert into public.task_template_step_dependencies (step_id, depends_on_step_id)
  select p_step_id, dependency_id
  from unnest(coalesce(p_depends_on_step_ids, '{}'::uuid[])) dependency_id;
  get diagnostics inserted_count = row_count;
  perform set_config('app.task_template_step_authorised', '', true);
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values ('TaskTemplateDependenciesChanged', 'task_template', target_template, (select auth.uid()),
    jsonb_build_object('step_id', p_step_id, 'dependency_count', inserted_count));
  return inserted_count;
end;
$$;

create or replace function public.approve_task_template(p_template_id uuid)
returns public.task_templates language plpgsql security definer set search_path = '' as $$
declare target public.task_templates; updated public.task_templates;
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  select * into target from public.task_templates where id = p_template_id for update;
  if not found then raise exception 'Template not found' using errcode = 'P0002'; end if;
  if target.status <> 'draft' then raise exception 'Only a draft template can be approved' using errcode = '23514'; end if;
  if not exists (select 1 from public.task_template_steps where template_id = p_template_id) then raise exception 'A template requires at least one step' using errcode = '23514'; end if;
  perform set_config('app.task_template_update_authorised', 'yes', true);
  update public.task_templates set status = 'retired', is_default = false
  where status = 'approved';
  update public.task_templates set status = 'approved', is_default = true,
    approved_by = (select auth.uid()), approved_at = now()
  where id = p_template_id returning * into updated;
  perform set_config('app.task_template_update_authorised', '', true);
  insert into public.workflow_events (event_type, aggregate_type, aggregate_id, actor_user_id, payload)
  values ('TaskTemplateApproved', 'task_template', updated.id, (select auth.uid()),
    jsonb_build_object('version_number', updated.version_number, 'name', updated.name));
  return updated;
end;
$$;

create or replace function public.sync_booking_anchored_task_dates(
  p_booking_id uuid,
  p_reason text
)
returns integer language plpgsql security definer set search_path = '' as $$
declare booking_record public.bookings; changed_count integer;
begin
  select * into booking_record from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  with changes as (
    select
      t.id,
      t.status,
      t.due_date as old_due_date,
      public.calculate_template_task_due_date(
        t.due_anchor, t.due_offset_days, booking_record
      ) as new_due_date
    from public.tasks t
    where t.booking_id = p_booking_id
      and t.status in ('blocked', 'ready')
      and t.due_anchor in ('booking_confirmed', 'charter_start', 'charter_end')
  ),
  updated as (
    update public.tasks t
    set due_date = changes.new_due_date
    from changes
    where t.id = changes.id
      and t.due_date is distinct from changes.new_due_date
    returning t.id, changes.status, changes.old_due_date, changes.new_due_date
  )
  insert into public.task_history (
    task_id, action, from_status, to_status, reason, changed_by, metadata
  )
  select id, 'rescheduled', status, status, p_reason, (select auth.uid()),
    jsonb_build_object(
      'old_due_date', old_due_date,
      'new_due_date', new_due_date,
      'source', 'booking_amendment'
    )
  from updated;
  get diagnostics changed_count = row_count;
  perform public.refresh_booking_task_states(p_booking_id);
  return changed_count;
end;
$$;

create or replace function public.amend_confirmed_booking(
  p_booking_id uuid, p_yacht_id uuid, p_charter_start_date date, p_charter_end_date date,
  p_embarkation_port text, p_disembarkation_port text, p_guest_count smallint,
  p_charter_fee numeric, p_currency text, p_tax_rate numeric, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare locked_booking_id uuid; updated_booking public.bookings; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'An amendment reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if p_charter_end_date <= p_charter_start_date or p_charter_fee <= 0 or upper(trim(p_currency)) !~ '^[A-Z]{3}$' or p_tax_rate not between 0 and 100 then raise exception 'Valid reviewed booking details are required' using errcode = '22023'; end if;
  select id into locked_booking_id from public.bookings where id = p_booking_id and status = 'confirmed' for update;
  if locked_booking_id is null then raise exception 'Only a confirmed booking can be amended' using errcode = '23514'; end if;
  perform set_config('app.booking_reservation_authorised', 'yes', true);
  update public.booking_reservations set yacht_id = p_yacht_id, reserved_from = p_charter_start_date - 1, reserved_through = p_charter_end_date + 1 where booking_id = p_booking_id;
  perform set_config('app.booking_reservation_authorised', '', true);
  perform set_config('app.booking_update_authorised', 'yes', true);
  perform set_config('app.booking_amendment_reason', clean_reason, true);
  update public.bookings set yacht_id = p_yacht_id, charter_start_date = p_charter_start_date, charter_end_date = p_charter_end_date, embarkation_port = p_embarkation_port, disembarkation_port = p_disembarkation_port, guest_count = p_guest_count, charter_fee = p_charter_fee, currency = upper(trim(p_currency)), tax_rate = p_tax_rate where id = p_booking_id returning * into updated_booking;
  perform set_config('app.booking_update_authorised', '', true);
  perform set_config('app.booking_amendment_reason', '', true);
  perform set_config('app.task_update_authorised', 'yes', true);
  perform public.sync_booking_anchored_task_dates(p_booking_id, clean_reason);
  perform set_config('app.task_update_authorised', '', true);
  return updated_booking;
end;
$$;

create or replace function public.transition_booking_status(
  p_booking_id uuid, p_new_status public.booking_status, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare current_booking public.bookings; updated_booking public.bookings; target_enquiry_status public.enquiry_status; clean_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  if not ((current_booking.status = 'confirmed' and p_new_status in ('charter_active','cancelled')) or (current_booking.status = 'charter_active' and p_new_status in ('completed','cancelled'))) then
    raise exception 'Invalid booking status transition' using errcode = '23514';
  end if;
  perform set_config('app.booking_update_authorised', 'yes', true);
  perform set_config('app.booking_transition_reason', clean_reason, true);
  update public.bookings set status = p_new_status where id = p_booking_id returning * into updated_booking;
  perform set_config('app.booking_update_authorised', '', true);
  perform set_config('app.booking_transition_reason', '', true);
  if p_new_status = 'cancelled' then
    perform set_config('app.booking_reservation_authorised', 'yes', true);
    update public.booking_reservations set active = false where booking_id = p_booking_id;
    perform set_config('app.booking_reservation_authorised', '', true);
    perform set_config('app.task_update_authorised', 'yes', true);
    with targets as materialized (
      select id, status as old_status
      from public.tasks
      where booking_id = p_booking_id and status in ('blocked', 'ready')
    ),
    cancelled as (
      update public.tasks t set
        status = 'cancelled', blocked_reason = null,
        cancelled_by = (select auth.uid()), cancelled_at = now()
      from targets
      where t.id = targets.id
      returning t.id, targets.old_status
    )
    insert into public.task_history (
      task_id, action, from_status, to_status, reason, changed_by
    )
    select id, 'cancelled', old_status, 'cancelled',
      'Booking cancelled: ' || clean_reason, (select auth.uid())
    from cancelled;
    perform set_config('app.task_update_authorised', '', true);
  end if;
  target_enquiry_status := case p_new_status
    when 'charter_active' then 'charter_active'::public.enquiry_status
    when 'completed' then 'completed'::public.enquiry_status
    else 'cancelled'::public.enquiry_status
  end;
  perform set_config('app.booking_enquiry_transition_authorised', 'yes', true);
  perform public.transition_enquiry_status(current_booking.enquiry_id, target_enquiry_status, clean_reason);
  perform set_config('app.booking_enquiry_transition_authorised', '', true);
  return updated_booking;
end;
$$;

alter function public.amend_confirmed_booking(
  uuid,uuid,date,date,text,text,smallint,numeric,text,numeric,text
) security definer;
alter function public.transition_booking_status(
  uuid,public.booking_status,text
) security definer;

-- Booking confirmation now requires and applies the approved default task template.
create or replace function public.confirm_booking(
  p_enquiry_id uuid,
  p_source_offer_id uuid,
  p_yacht_id uuid,
  p_charter_start_date date,
  p_charter_end_date date,
  p_embarkation_port text,
  p_disembarkation_port text,
  p_guest_count smallint,
  p_charter_fee numeric,
  p_currency text,
  p_tax_rate numeric,
  p_signed_agreement_confirmed boolean,
  p_confirmation_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare
  enquiry_record public.enquiries;
  offer_record public.offers;
  created_booking public.bookings;
  clean_reason text := nullif(trim(p_confirmation_reason), '');
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if p_signed_agreement_confirmed is not true then raise exception 'All required signatures must be explicitly confirmed' using errcode = '23514'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A confirmation reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  if p_charter_start_date is null or p_charter_end_date <= p_charter_start_date then raise exception 'Valid charter dates are required' using errcode = '22023'; end if;
  if p_charter_fee <= 0 or upper(trim(p_currency)) !~ '^[A-Z]{3}$' or p_tax_rate not between 0 and 100 then raise exception 'Valid reviewed commercial terms are required' using errcode = '22023'; end if;
  if not exists (select 1 from public.task_templates where status = 'approved' and is_default) then raise exception 'An approved default task template is required' using errcode = '23514'; end if;
  select * into enquiry_record from public.enquiries where id = p_enquiry_id for update;
  if not found then raise exception 'Enquiry not found or not accessible' using errcode = 'P0002'; end if;
  if enquiry_record.status <> 'awaiting_signatures' then raise exception 'The enquiry must be awaiting signatures' using errcode = '23514'; end if;
  if enquiry_record.requested_yacht_id <> p_yacht_id then raise exception 'The confirmed yacht must match the reviewed enquiry' using errcode = '23514'; end if;
  select * into offer_record from public.offers where id = p_source_offer_id;
  if not found or offer_record.status <> 'sent' or offer_record.enquiry_id <> p_enquiry_id or offer_record.yacht_id <> p_yacht_id then raise exception 'A sent offer for this enquiry and yacht is required' using errcode = '23514'; end if;
  perform set_config('app.booking_create_authorised', 'yes', true);
  insert into public.bookings (
    enquiry_id, source_offer_id, yacht_id, customer_contact_id, broker_contact_id,
    broker_company_id, charter_start_date, charter_end_date, embarkation_port,
    disembarkation_port, guest_count, charter_fee, currency, tax_rate,
    signed_agreement_confirmed_by, confirmation_reason
  ) values (
    p_enquiry_id, p_source_offer_id, p_yacht_id, enquiry_record.customer_contact_id,
    enquiry_record.broker_contact_id, enquiry_record.broker_company_id,
    p_charter_start_date, p_charter_end_date, p_embarkation_port,
    p_disembarkation_port, p_guest_count, p_charter_fee, upper(trim(p_currency)),
    p_tax_rate, (select auth.uid()), clean_reason
  ) returning * into created_booking;
  perform set_config('app.booking_create_authorised', '', true);
  perform set_config('app.booking_reservation_authorised', 'yes', true);
  insert into public.booking_reservations (booking_id, yacht_id, reserved_from, reserved_through)
  values (created_booking.id, p_yacht_id, p_charter_start_date - 1, p_charter_end_date + 1);
  perform set_config('app.booking_reservation_authorised', '', true);
  perform set_config('app.yachtfolio_action_authorised', 'yes', true);
  insert into public.yachtfolio_booking_actions (booking_id) values (created_booking.id);
  perform set_config('app.yachtfolio_action_authorised', '', true);
  perform public.generate_booking_tasks(created_booking.id);
  perform set_config('app.booking_enquiry_transition_authorised', 'yes', true);
  perform public.transition_enquiry_status(p_enquiry_id, 'booked', clean_reason);
  perform set_config('app.booking_enquiry_transition_authorised', '', true);
  return created_booking;
end;
$$;

create policy "Active staff can view task templates" on public.task_templates
  for select to authenticated using ((select public.is_active_staff()));
create policy "Administrators can add task templates" on public.task_templates
  for insert to authenticated with check ((select public.is_administrator()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Administrators can update task templates" on public.task_templates
  for update to authenticated using ((select public.is_administrator())) with check ((select public.is_administrator()) and updated_by = (select auth.uid()));
create policy "Active staff can view task template steps" on public.task_template_steps
  for select to authenticated using ((select public.is_active_staff()));
create policy "Administrators can add task template steps" on public.task_template_steps
  for insert to authenticated with check ((select public.is_administrator()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Administrators can update task template steps" on public.task_template_steps
  for update to authenticated using ((select public.is_administrator())) with check ((select public.is_administrator()) and updated_by = (select auth.uid()));
create policy "Administrators can delete draft task template steps" on public.task_template_steps
  for delete to authenticated using ((select public.is_administrator()));
create policy "Active staff can view template dependencies" on public.task_template_step_dependencies
  for select to authenticated using ((select public.is_active_staff()));
create policy "Administrators can add template dependencies" on public.task_template_step_dependencies
  for insert to authenticated with check ((select public.is_administrator()));
create policy "Active staff can view tasks" on public.tasks
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add tasks" on public.tasks
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "Active staff can update tasks" on public.tasks
  for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()) and updated_by = (select auth.uid()));
create policy "Active staff can view task dependencies" on public.task_dependencies
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add task dependencies" on public.task_dependencies
  for insert to authenticated with check ((select public.is_active_staff()));
create policy "Active staff can view task history" on public.task_history
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can view task notes" on public.task_notes
  for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can add task notes" on public.task_notes
  for insert to authenticated with check ((select public.is_active_staff()) and created_by = (select auth.uid()));

revoke all on public.task_templates, public.task_template_steps,
  public.task_template_step_dependencies, public.tasks, public.task_dependencies,
  public.task_history, public.task_notes from anon, authenticated;
grant select, insert, update on public.task_templates to authenticated;
grant select, insert, update, delete on public.task_template_steps to authenticated;
grant select, insert on public.task_template_step_dependencies to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert on public.task_dependencies to authenticated;
grant select on public.task_history to authenticated;
grant select, insert on public.task_notes to authenticated;
grant usage, select on sequence public.task_reference_sequence to authenticated;

revoke all on function public.generate_booking_tasks(uuid,uuid),
  public.complete_task(uuid,text), public.reopen_task(uuid,text),
  public.update_task_schedule(uuid,date,uuid,public.task_priority,text),
  public.add_ad_hoc_task(uuid,text,text,date,public.task_priority,uuid),
  public.cancel_ad_hoc_task(uuid,text), public.add_task_note(uuid,text),
  public.clone_task_template(uuid,text),
  public.update_task_template_step(uuid,text,text,public.task_priority,boolean,public.task_due_anchor,integer,boolean,smallint,smallint),
  public.add_task_template_step(uuid,text,text,text,public.task_priority,boolean,public.task_due_anchor,integer,boolean,smallint,smallint,integer),
  public.delete_task_template_step(uuid,text),
  public.replace_task_template_dependencies(uuid,uuid[]),
  public.approve_task_template(uuid) from public, anon;
grant execute on function public.generate_booking_tasks(uuid,uuid),
  public.complete_task(uuid,text), public.reopen_task(uuid,text),
  public.update_task_schedule(uuid,date,uuid,public.task_priority,text),
  public.add_ad_hoc_task(uuid,text,text,date,public.task_priority,uuid),
  public.cancel_ad_hoc_task(uuid,text), public.add_task_note(uuid,text),
  public.clone_task_template(uuid,text),
  public.update_task_template_step(uuid,text,text,public.task_priority,boolean,public.task_due_anchor,integer,boolean,smallint,smallint),
  public.add_task_template_step(uuid,text,text,text,public.task_priority,boolean,public.task_due_anchor,integer,boolean,smallint,smallint,integer),
  public.delete_task_template_step(uuid,text),
  public.replace_task_template_dependencies(uuid,uuid[]),
  public.approve_task_template(uuid) to authenticated;

revoke all on function public.normalise_task_record(),
  public.guard_task_template_mutation(), public.guard_task_template_step_mutation(),
  public.guard_task_dependency_template(), public.guard_task_mutation(),
  public.prevent_task_template_cycles(), public.prevent_task_cycles(),
  public.calculate_template_task_due_date(public.task_due_anchor,integer,public.bookings),
  public.refresh_booking_task_states(uuid),
  public.sync_booking_anchored_task_dates(uuid,text) from public, anon, authenticated;
