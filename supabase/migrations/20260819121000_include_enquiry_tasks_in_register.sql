-- Compatibility migration for databases that received the task-context change
-- before the register functions were expanded. The public result contract stays
-- unchanged; an enquiry reference occupies the existing context fields.

create or replace function public.list_task_register_page(
  p_limit integer default 50, p_cursor_due_sort date default null, p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_status public.task_status default null, p_priority public.task_priority default null, p_due_state text default null,
  p_assignee_id uuid default null, p_unassigned boolean default false, p_query text default null
) returns table (id uuid, reference text, booking_id uuid, step_code text, title text, status public.task_status, priority public.task_priority, source public.task_source, required boolean, due_date date, blocked_reason text, external_action public.task_external_action, assigned_user_id uuid, booking_reference text, yacht_name text, assignee_name text, created_at timestamptz, due_sort date)
language plpgsql security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100)); clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if num_nonnulls(p_cursor_due_sort, p_cursor_created_at, p_cursor_id) not in (0, 3) then raise exception 'Pagination cursor is incomplete' using errcode = '22023'; end if;
  if p_unassigned and p_assignee_id is not null then raise exception 'Choose an assignee or unassigned tasks' using errcode = '22023'; end if;
  if p_due_state is not null and p_due_state not in ('overdue','today','future','none') then raise exception 'Unknown due-state filter' using errcode = '22023'; end if;
  return query select task.id, task.reference, task.booking_id, task.step_code, task.title, task.status, task.priority, task.source, task.required, task.due_date, task.blocked_reason, task.external_action, task.assigned_user_id,
    coalesce(booking.reference, enquiry.reference), coalesce(booking_yacht.name, enquiry_yacht.name), assignee.display_name, task.created_at, coalesce(task.due_date, date '9999-12-31')
  from public.tasks task left join public.bookings booking on booking.id = task.booking_id left join public.yachts booking_yacht on booking_yacht.id = booking.yacht_id
    left join public.enquiries enquiry on enquiry.id = task.enquiry_id left join public.yachts enquiry_yacht on enquiry_yacht.id = enquiry.requested_yacht_id left join public.profiles assignee on assignee.id = task.assigned_user_id
  where (p_status is null or task.status = p_status) and (p_priority is null or task.priority = p_priority) and (not p_unassigned or task.assigned_user_id is null) and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (p_due_state is null or (p_due_state = 'overdue' and task.status in ('blocked','ready') and task.due_date < current_date) or (p_due_state = 'today' and task.status in ('blocked','ready') and task.due_date = current_date) or (p_due_state = 'future' and task.status in ('blocked','ready') and task.due_date > current_date) or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked','ready'))))
    and (clean_query is null or strpos(lower(concat_ws(' ',task.reference,task.step_code,task.title,booking.reference,enquiry.reference,booking_yacht.name,enquiry_yacht.name)),clean_query)>0)
    and (p_cursor_due_sort is null or coalesce(task.due_date,date '9999-12-31') > p_cursor_due_sort or (coalesce(task.due_date,date '9999-12-31') = p_cursor_due_sort and task.created_at < p_cursor_created_at) or (coalesce(task.due_date,date '9999-12-31') = p_cursor_due_sort and task.created_at = p_cursor_created_at and task.id < p_cursor_id))
  order by coalesce(task.due_date,date '9999-12-31'), task.created_at desc, task.id desc limit clean_limit;
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
  select count(*) into result from public.tasks task left join public.bookings booking on booking.id = task.booking_id left join public.yachts booking_yacht on booking_yacht.id = booking.yacht_id left join public.enquiries enquiry on enquiry.id = task.enquiry_id left join public.yachts enquiry_yacht on enquiry_yacht.id = enquiry.requested_yacht_id
  where (p_status is null or task.status = p_status) and (p_priority is null or task.priority = p_priority) and (not p_unassigned or task.assigned_user_id is null) and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (p_due_state is null or (p_due_state = 'overdue' and task.status in ('blocked','ready') and task.due_date < current_date) or (p_due_state = 'today' and task.status in ('blocked','ready') and task.due_date = current_date) or (p_due_state = 'future' and task.status in ('blocked','ready') and task.due_date > current_date) or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked','ready'))))
    and (clean_query is null or strpos(lower(concat_ws(' ',task.reference,task.step_code,task.title,booking.reference,enquiry.reference,booking_yacht.name,enquiry_yacht.name)),clean_query)>0);
  return result;
end;
$$;
