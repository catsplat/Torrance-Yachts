-- Operational task completion: retain existing booking tasks while allowing a
-- staff-created task to live on either an enquiry or a booking. Conditions are
-- additive and evaluated in PostgreSQL so browser state can never unlock work.

alter table public.tasks
  alter column booking_id drop not null,
  add column if not exists enquiry_id uuid references public.enquiries (id) on delete restrict;

alter table public.tasks drop constraint if exists tasks_work_context;
alter table public.tasks add constraint tasks_work_context check (
  (booking_id is not null and enquiry_id is null)
  or (booking_id is null and enquiry_id is not null)
);

create type public.task_condition_type as enum (
  'approved_document',
  'booking_status',
  'not_before_date'
);

create table public.task_condition_rules (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  condition_type public.task_condition_type not null,
  document_type public.document_type,
  expected_booking_status public.booking_status,
  not_before_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint task_condition_rule_shape check (
    (condition_type = 'approved_document' and document_type is not null and expected_booking_status is null and not_before_date is null)
    or (condition_type = 'booking_status' and document_type is null and expected_booking_status is not null and not_before_date is null)
    or (condition_type = 'not_before_date' and document_type is null and expected_booking_status is null and not_before_date is not null)
  ),
  unique (task_id, condition_type, document_type, expected_booking_status, not_before_date)
);

create index task_condition_rules_task_idx on public.task_condition_rules (task_id);
alter table public.task_condition_rules enable row level security;
create policy "Active staff can view task conditions" on public.task_condition_rules
  for select to authenticated using ((select public.is_active_staff()));

create or replace function public.task_readiness(p_task_id uuid)
returns table (is_ready boolean, blocked_reason text)
language plpgsql security definer set search_path = '' as $$
declare target public.tasks;
declare missing_document public.document_type;
declare required_status public.booking_status;
declare wait_until date;
begin
  select * into target from public.tasks where id = p_task_id;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;

  if target.due_date_required and target.due_date is null then
    return query select false, 'Waiting for its required date.'::text;
    return;
  end if;

  if exists (
    select 1 from public.task_dependencies d
    join public.tasks parent on parent.id = d.depends_on_task_id
    where d.task_id = target.id and parent.status <> 'completed'
  ) then
    return query select false, 'Waiting for a prerequisite task.'::text;
    return;
  end if;

  if target.booking_id is not null then
    select rule.document_type into missing_document
    from public.task_condition_rules rule
    where rule.task_id = target.id and rule.condition_type = 'approved_document'
      and not exists (
        select 1 from public.documents document
        where document.booking_id = target.booking_id
          and document.document_type = rule.document_type
          and document.verification_status = 'verified'
          and document.scan_status = 'released'
      )
    limit 1;
    if missing_document is not null then
      return query select false, ('Waiting for approved ' || replace(missing_document::text, '_', ' ') || '.')::text;
      return;
    end if;

    select rule.expected_booking_status into required_status
    from public.task_condition_rules rule
    where rule.task_id = target.id and rule.condition_type = 'booking_status'
      and not exists (
        select 1 from public.bookings booking
        where booking.id = target.booking_id and booking.status = rule.expected_booking_status
      )
    limit 1;
    if required_status is not null then
      return query select false, ('Waiting for booking status: ' || replace(required_status::text, '_', ' ') || '.')::text;
      return;
    end if;
  end if;

  select rule.not_before_date into wait_until
  from public.task_condition_rules rule
  where rule.task_id = target.id and rule.condition_type = 'not_before_date'
    and current_date < rule.not_before_date
  order by rule.not_before_date asc
  limit 1;
  if wait_until is not null then
    return query select false, ('Available on ' || to_char(wait_until, 'DD Mon YYYY') || '.')::text;
    return;
  end if;

  return query select true, null::text;
end;
$$;

create or replace function public.refresh_task_readiness(p_task_id uuid)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare target public.tasks;
declare readiness record;
begin
  select * into target from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  if target.status in ('completed', 'cancelled') then return target; end if;
  select * into readiness from public.task_readiness(target.id);
  perform set_config('app.task_update_authorised', 'yes', true);
  update public.tasks set
    status = case when readiness.is_ready then 'ready'::public.task_status else 'blocked'::public.task_status end,
    blocked_reason = readiness.blocked_reason
  where id = target.id
  returning * into target;
  perform set_config('app.task_update_authorised', '', true);
  return target;
end;
$$;

create or replace function public.refresh_task_readiness_for_booking(p_booking_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare task_record record;
declare refreshed integer := 0;
begin
  for task_record in select id from public.tasks where booking_id = p_booking_id and status in ('blocked', 'ready') loop
    perform public.refresh_task_readiness(task_record.id);
    refreshed := refreshed + 1;
  end loop;
  return refreshed;
end;
$$;

create or replace function public.add_operational_task(
  p_booking_id uuid,
  p_enquiry_id uuid,
  p_title text,
  p_description text,
  p_due_date date,
  p_priority public.task_priority,
  p_assigned_user_id uuid,
  p_depends_on_task_ids uuid[] default '{}',
  p_document_type public.document_type default null,
  p_expected_booking_status public.booking_status default null,
  p_not_before_date date default null
)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare created public.tasks;
declare clean_title text := nullif(trim(p_title), '');
declare dependency_id uuid;
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if (p_booking_id is null) = (p_enquiry_id is null) then raise exception 'Choose one enquiry or booking for the task' using errcode = '22023'; end if;
  if clean_title is null or char_length(clean_title) > 240 then raise exception 'A title between 2 and 240 characters is required' using errcode = '22023'; end if;
  if p_booking_id is not null and not exists (select 1 from public.bookings where id = p_booking_id) then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if p_enquiry_id is not null and not exists (select 1 from public.enquiries where id = p_enquiry_id) then raise exception 'Enquiry not found' using errcode = 'P0002'; end if;
  if p_assigned_user_id is not null and not exists (select 1 from public.profiles where id = p_assigned_user_id and active) then raise exception 'Assignee must be active' using errcode = '23514'; end if;
  if (p_document_type is not null or p_expected_booking_status is not null) and p_booking_id is null then raise exception 'Document and booking-status conditions require a booking task' using errcode = '22023'; end if;

  perform set_config('app.task_create_authorised', 'yes', true);
  insert into public.tasks (
    booking_id, enquiry_id, source, title, description, status, priority, required,
    due_date, assigned_user_id, created_by, updated_by
  ) values (
    p_booking_id, p_enquiry_id, 'ad_hoc', clean_title, nullif(trim(p_description), ''), 'blocked', p_priority, false,
    p_due_date, p_assigned_user_id, (select auth.uid()), (select auth.uid())
  ) returning * into created;
  perform set_config('app.task_create_authorised', '', true);

  foreach dependency_id in array coalesce(p_depends_on_task_ids, '{}') loop
    if dependency_id = created.id or not exists (
      select 1 from public.tasks dependency
      where dependency.id = dependency_id
        and dependency.booking_id is not distinct from p_booking_id
        and dependency.enquiry_id is not distinct from p_enquiry_id
    ) then raise exception 'Each prerequisite must belong to the same work item' using errcode = '22023'; end if;
    insert into public.task_dependencies (task_id, depends_on_task_id) values (created.id, dependency_id);
  end loop;
  if p_document_type is not null then
    insert into public.task_condition_rules (task_id, condition_type, document_type, created_by)
    values (created.id, 'approved_document', p_document_type, (select auth.uid()));
  end if;
  if p_expected_booking_status is not null then
    insert into public.task_condition_rules (task_id, condition_type, expected_booking_status, created_by)
    values (created.id, 'booking_status', p_expected_booking_status, (select auth.uid()));
  end if;
  if p_not_before_date is not null then
    insert into public.task_condition_rules (task_id, condition_type, not_before_date, created_by)
    values (created.id, 'not_before_date', p_not_before_date, (select auth.uid()));
  end if;
  perform public.refresh_task_readiness(created.id);
  insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by, metadata)
  values (created.id, 'created', null, (select status from public.tasks where id = created.id), 'Operational task added', (select auth.uid()),
    jsonb_build_object('dependency_count', cardinality(coalesce(p_depends_on_task_ids, '{}')), 'document_condition', p_document_type, 'booking_status_condition', p_expected_booking_status, 'not_before_date', p_not_before_date));
  select * into created from public.tasks where id = created.id;
  return created;
end;
$$;

create or replace function public.refresh_booking_task_conditions_on_document_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (old.verification_status is distinct from new.verification_status or old.scan_status is distinct from new.scan_status) then
    perform public.refresh_task_readiness_for_booking(new.booking_id);
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_booking_task_conditions_on_document_change on public.documents;
create trigger refresh_booking_task_conditions_on_document_change
  after update of verification_status, scan_status on public.documents
  for each row execute function public.refresh_booking_task_conditions_on_document_change();

create or replace function public.refresh_booking_task_conditions_on_booking_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status is distinct from new.status then perform public.refresh_task_readiness_for_booking(new.id); end if;
  return new;
end;
$$;

drop trigger if exists refresh_booking_task_conditions_on_booking_change on public.bookings;
create trigger refresh_booking_task_conditions_on_booking_change
  after update of status on public.bookings
  for each row execute function public.refresh_booking_task_conditions_on_booking_change();

-- A cancellation preserves the historic task trail, stops unfinished work and
-- leaves one auditable acknowledgement for operations to complete.
create or replace function public.transition_booking_status(
  p_booking_id uuid, p_new_status public.booking_status, p_reason text
)
returns public.bookings language plpgsql security invoker set search_path = '' as $$
declare current_booking public.bookings; updated_booking public.bookings; target_enquiry_status public.enquiry_status; clean_reason text := nullif(trim(p_reason), ''); cancellation_task public.tasks;
begin
  if not public.is_active_staff() then raise exception 'An active internal account is required' using errcode = '42501'; end if;
  if clean_reason is null or char_length(clean_reason) > 1000 then raise exception 'A reason between 2 and 1000 characters is required' using errcode = '22023'; end if;
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found or not accessible' using errcode = 'P0002'; end if;
  if not ((current_booking.status = 'confirmed' and p_new_status in ('charter_active','cancelled')) or (current_booking.status = 'charter_active' and p_new_status in ('completed','cancelled'))) then raise exception 'Invalid booking status transition' using errcode = '23514'; end if;
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
    with targets as materialized (select id, status as old_status from public.tasks where booking_id = p_booking_id and status in ('blocked', 'ready')),
    cancelled as (update public.tasks task set status = 'cancelled', blocked_reason = null, cancelled_by = (select auth.uid()), cancelled_at = now() from targets where task.id = targets.id returning task.id, targets.old_status)
    insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
    select id, 'cancelled', old_status, 'cancelled', 'Booking cancelled: ' || clean_reason, (select auth.uid()) from cancelled;
    perform set_config('app.task_update_authorised', '', true);
    perform set_config('app.task_create_authorised', 'yes', true);
    insert into public.tasks (booking_id, source, title, description, status, priority, required, created_by, updated_by)
    values (p_booking_id, 'ad_hoc', 'Confirm cancellation', 'Confirm the cancellation has been communicated and recorded.', 'ready', 'high', true, (select auth.uid()), (select auth.uid())) returning * into cancellation_task;
    perform set_config('app.task_create_authorised', '', true);
    insert into public.task_history (task_id, action, from_status, to_status, reason, changed_by)
    values (cancellation_task.id, 'created', null, 'ready', 'Created when booking was cancelled', (select auth.uid()));
  end if;
  target_enquiry_status := case p_new_status when 'charter_active' then 'charter_active'::public.enquiry_status when 'completed' then 'completed'::public.enquiry_status else 'cancelled'::public.enquiry_status end;
  perform set_config('app.booking_enquiry_transition_authorised', 'yes', true);
  perform public.transition_enquiry_status(current_booking.enquiry_id, target_enquiry_status, clean_reason);
  perform set_config('app.booking_enquiry_transition_authorised', '', true);
  return updated_booking;
end;
$$;

-- The shared register includes both booking workflow tasks and earlier enquiry
-- tasks. Existing return columns are retained for backwards-compatible clients.
create or replace function public.list_task_register_page(
  p_limit integer default 50, p_cursor_due_sort date default null, p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_status public.task_status default null, p_priority public.task_priority default null, p_due_state text default null,
  p_assignee_id uuid default null, p_unassigned boolean default false, p_query text default null
) returns table (
  id uuid, reference text, booking_id uuid, step_code text, title text, status public.task_status, priority public.task_priority, source public.task_source,
  required boolean, due_date date, blocked_reason text, external_action public.task_external_action, assigned_user_id uuid,
  booking_reference text, yacht_name text, assignee_name text, created_at timestamptz, due_sort date
) language plpgsql security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100)); clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if num_nonnulls(p_cursor_due_sort, p_cursor_created_at, p_cursor_id) not in (0, 3) then raise exception 'Pagination cursor is incomplete' using errcode = '22023'; end if;
  if p_unassigned and p_assignee_id is not null then raise exception 'Choose an assignee or unassigned tasks' using errcode = '22023'; end if;
  if p_due_state is not null and p_due_state not in ('overdue', 'today', 'future', 'none') then raise exception 'Unknown due-state filter' using errcode = '22023'; end if;
  return query
  select task.id, task.reference, task.booking_id, task.step_code, task.title, task.status, task.priority, task.source, task.required, task.due_date, task.blocked_reason, task.external_action, task.assigned_user_id,
    coalesce(booking.reference, enquiry.reference), coalesce(booking_yacht.name, enquiry_yacht.name), assignee.display_name, task.created_at, coalesce(task.due_date, date '9999-12-31')
  from public.tasks task
  left join public.bookings booking on booking.id = task.booking_id
  left join public.yachts booking_yacht on booking_yacht.id = booking.yacht_id
  left join public.enquiries enquiry on enquiry.id = task.enquiry_id
  left join public.yachts enquiry_yacht on enquiry_yacht.id = enquiry.requested_yacht_id
  left join public.profiles assignee on assignee.id = task.assigned_user_id
  where (p_status is null or task.status = p_status) and (p_priority is null or task.priority = p_priority)
    and (not p_unassigned or task.assigned_user_id is null) and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (p_due_state is null or (p_due_state = 'overdue' and task.status in ('blocked','ready') and task.due_date < current_date) or (p_due_state = 'today' and task.status in ('blocked','ready') and task.due_date = current_date) or (p_due_state = 'future' and task.status in ('blocked','ready') and task.due_date > current_date) or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked','ready'))))
    and (clean_query is null or strpos(lower(concat_ws(' ', task.reference, task.step_code, task.title, booking.reference, enquiry.reference, booking_yacht.name, enquiry_yacht.name)), clean_query) > 0)
    and (p_cursor_due_sort is null or coalesce(task.due_date, date '9999-12-31') > p_cursor_due_sort or (coalesce(task.due_date, date '9999-12-31') = p_cursor_due_sort and task.created_at < p_cursor_created_at) or (coalesce(task.due_date, date '9999-12-31') = p_cursor_due_sort and task.created_at = p_cursor_created_at and task.id < p_cursor_id))
  order by coalesce(task.due_date, date '9999-12-31'), task.created_at desc, task.id desc limit clean_limit;
end;
$$;

create or replace function public.count_task_register(
  p_status public.task_status default null, p_priority public.task_priority default null, p_due_state text default null,
  p_assignee_id uuid default null, p_unassigned boolean default false, p_query text default null
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare clean_query text := nullif(lower(trim(coalesce(p_query, ''))), ''); result bigint;
begin
  if p_unassigned and p_assignee_id is not null then raise exception 'Choose an assignee or unassigned tasks' using errcode = '22023'; end if;
  if p_due_state is not null and p_due_state not in ('overdue','today','future','none') then raise exception 'Unknown due-state filter' using errcode = '22023'; end if;
  select count(*) into result from public.tasks task
  left join public.bookings booking on booking.id = task.booking_id left join public.yachts booking_yacht on booking_yacht.id = booking.yacht_id
  left join public.enquiries enquiry on enquiry.id = task.enquiry_id left join public.yachts enquiry_yacht on enquiry_yacht.id = enquiry.requested_yacht_id
  where (p_status is null or task.status = p_status) and (p_priority is null or task.priority = p_priority)
    and (not p_unassigned or task.assigned_user_id is null) and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (p_due_state is null or (p_due_state = 'overdue' and task.status in ('blocked','ready') and task.due_date < current_date) or (p_due_state = 'today' and task.status in ('blocked','ready') and task.due_date = current_date) or (p_due_state = 'future' and task.status in ('blocked','ready') and task.due_date > current_date) or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked','ready'))))
    and (clean_query is null or strpos(lower(concat_ws(' ', task.reference, task.step_code, task.title, booking.reference, enquiry.reference, booking_yacht.name, enquiry_yacht.name)), clean_query) > 0);
  return result;
end;
$$;

revoke all on function public.task_readiness(uuid), public.refresh_task_readiness(uuid), public.refresh_task_readiness_for_booking(uuid), public.add_operational_task(uuid,uuid,text,text,date,public.task_priority,uuid,uuid[],public.document_type,public.booking_status,date) from public, anon;
grant execute on function public.add_operational_task(uuid,uuid,text,text,date,public.task_priority,uuid,uuid[],public.document_type,public.booking_status,date) to authenticated;
