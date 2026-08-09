-- Complete server-side pagination for the remaining daily operational registers.

create index offers_register_order_idx on public.offers (updated_at desc, id desc);
create index bookings_register_order_idx on public.bookings (charter_start_date, id);
create index tasks_register_order_idx on public.tasks (
  (coalesce(due_date, date '9999-12-31')), created_at desc, id desc
);

create or replace function public.list_offer_register_page(
  p_limit integer default 50,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status public.offer_status default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  reference text,
  version_number integer,
  status public.offer_status,
  subject_snapshot text,
  recipient_name text,
  proposed_charter_fee numeric,
  currency text,
  pricing_basis public.offer_pricing_basis,
  updated_at timestamptz,
  enquiry_reference text,
  yacht_id uuid,
  yacht_name text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select
    offer.id, offer.reference, offer.version_number, offer.status,
    offer.subject_snapshot, offer.recipient_name, offer.proposed_charter_fee,
    offer.currency, offer.pricing_basis, offer.updated_at, enquiry.reference,
    yacht.id, yacht.name
  from public.offers offer
  join public.enquiries enquiry on enquiry.id = offer.enquiry_id
  join public.yachts yacht on yacht.id = offer.yacht_id
  where (p_status is null or offer.status = p_status)
    and (p_yacht_id is null or offer.yacht_id = p_yacht_id)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      offer.reference, offer.subject_snapshot, offer.recipient_name,
      enquiry.reference, yacht.name
    )), clean_query) > 0)
    and (
      p_cursor_updated_at is null
      or offer.updated_at < p_cursor_updated_at
      or (offer.updated_at = p_cursor_updated_at and offer.id < p_cursor_id)
    )
  order by offer.updated_at desc, offer.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_offer_register(
  p_status public.offer_status default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  with values as (
    select nullif(lower(trim(coalesce(p_query, ''))), '') as clean_query
  )
  select count(*)
  from public.offers offer
  join public.enquiries enquiry on enquiry.id = offer.enquiry_id
  join public.yachts yacht on yacht.id = offer.yacht_id
  cross join values
  where (p_status is null or offer.status = p_status)
    and (p_yacht_id is null or offer.yacht_id = p_yacht_id)
    and (values.clean_query is null or strpos(lower(concat_ws(' ',
      offer.reference, offer.subject_snapshot, offer.recipient_name,
      enquiry.reference, yacht.name
    )), values.clean_query) > 0);
$$;

create or replace function public.list_booking_register_page(
  p_limit integer default 50,
  p_cursor_charter_start_date date default null,
  p_cursor_id uuid default null,
  p_status public.booking_status default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  reference text,
  status public.booking_status,
  charter_start_date date,
  charter_end_date date,
  yacht_id uuid,
  yacht_name text,
  enquiry_reference text,
  enquiry_summary text,
  reserved_from date,
  reserved_through date,
  reservation_active boolean,
  yachtfolio_status public.yachtfolio_action_status
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_charter_start_date is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select
    booking.id, booking.reference, booking.status, booking.charter_start_date,
    booking.charter_end_date, yacht.id, yacht.name, enquiry.reference,
    enquiry.summary, reservation.reserved_from, reservation.reserved_through,
    reservation.active, yachtfolio.status
  from public.bookings booking
  join public.enquiries enquiry on enquiry.id = booking.enquiry_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  join public.booking_reservations reservation on reservation.booking_id = booking.id
  left join public.yachtfolio_booking_actions yachtfolio on yachtfolio.booking_id = booking.id
  where (p_status is null or booking.status = p_status)
    and (p_yacht_id is null or booking.yacht_id = p_yacht_id)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      booking.reference, yacht.name, enquiry.reference, enquiry.summary
    )), clean_query) > 0)
    and (
      p_cursor_charter_start_date is null
      or booking.charter_start_date > p_cursor_charter_start_date
      or (booking.charter_start_date = p_cursor_charter_start_date and booking.id > p_cursor_id)
    )
  order by booking.charter_start_date, booking.id
  limit clean_limit;
end;
$$;

create or replace function public.count_booking_register(
  p_status public.booking_status default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  with values as (
    select nullif(lower(trim(coalesce(p_query, ''))), '') as clean_query
  )
  select count(*)
  from public.bookings booking
  join public.enquiries enquiry on enquiry.id = booking.enquiry_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  join public.booking_reservations reservation on reservation.booking_id = booking.id
  cross join values
  where (p_status is null or booking.status = p_status)
    and (p_yacht_id is null or booking.yacht_id = p_yacht_id)
    and (values.clean_query is null or strpos(lower(concat_ws(' ',
      booking.reference, yacht.name, enquiry.reference, enquiry.summary
    )), values.clean_query) > 0);
$$;

create or replace function public.list_task_register_page(
  p_limit integer default 50,
  p_cursor_due_sort date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status public.task_status default null,
  p_priority public.task_priority default null,
  p_due_state text default null,
  p_assignee_id uuid default null,
  p_unassigned boolean default false,
  p_query text default null
)
returns table (
  id uuid,
  reference text,
  booking_id uuid,
  step_code text,
  title text,
  status public.task_status,
  priority public.task_priority,
  source public.task_source,
  required boolean,
  due_date date,
  blocked_reason text,
  external_action public.task_external_action,
  assigned_user_id uuid,
  booking_reference text,
  yacht_name text,
  assignee_name text,
  created_at timestamptz,
  due_sort date
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if num_nonnulls(p_cursor_due_sort, p_cursor_created_at, p_cursor_id) not in (0, 3) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  if p_unassigned and p_assignee_id is not null then
    raise exception 'Choose an assignee or unassigned tasks' using errcode = '22023';
  end if;
  if p_due_state is not null and p_due_state not in ('overdue', 'today', 'future', 'none') then
    raise exception 'Unknown due-state filter' using errcode = '22023';
  end if;

  return query
  select
    task.id, task.reference, task.booking_id, task.step_code, task.title,
    task.status, task.priority, task.source, task.required, task.due_date,
    task.blocked_reason, task.external_action, task.assigned_user_id,
    booking.reference, yacht.name, assignee.display_name, task.created_at,
    coalesce(task.due_date, date '9999-12-31')
  from public.tasks task
  join public.bookings booking on booking.id = task.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  left join public.profiles assignee on assignee.id = task.assigned_user_id
  where (p_status is null or task.status = p_status)
    and (p_priority is null or task.priority = p_priority)
    and (not p_unassigned or task.assigned_user_id is null)
    and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (
      p_due_state is null
      or (p_due_state = 'overdue' and task.status in ('blocked', 'ready') and task.due_date < current_date)
      or (p_due_state = 'today' and task.status in ('blocked', 'ready') and task.due_date = current_date)
      or (p_due_state = 'future' and task.status in ('blocked', 'ready') and task.due_date > current_date)
      or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked', 'ready')))
    )
    and (clean_query is null or strpos(lower(concat_ws(' ',
      task.reference, task.step_code, task.title, booking.reference, yacht.name
    )), clean_query) > 0)
    and (
      p_cursor_due_sort is null
      or coalesce(task.due_date, date '9999-12-31') > p_cursor_due_sort
      or (
        coalesce(task.due_date, date '9999-12-31') = p_cursor_due_sort
        and task.created_at < p_cursor_created_at
      )
      or (
        coalesce(task.due_date, date '9999-12-31') = p_cursor_due_sort
        and task.created_at = p_cursor_created_at
        and task.id < p_cursor_id
      )
    )
  order by coalesce(task.due_date, date '9999-12-31'), task.created_at desc, task.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_task_register(
  p_status public.task_status default null,
  p_priority public.task_priority default null,
  p_due_state text default null,
  p_assignee_id uuid default null,
  p_unassigned boolean default false,
  p_query text default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
  result bigint;
begin
  if p_unassigned and p_assignee_id is not null then
    raise exception 'Choose an assignee or unassigned tasks' using errcode = '22023';
  end if;
  if p_due_state is not null and p_due_state not in ('overdue', 'today', 'future', 'none') then
    raise exception 'Unknown due-state filter' using errcode = '22023';
  end if;

  select count(*) into result
  from public.tasks task
  join public.bookings booking on booking.id = task.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  where (p_status is null or task.status = p_status)
    and (p_priority is null or task.priority = p_priority)
    and (not p_unassigned or task.assigned_user_id is null)
    and (p_assignee_id is null or task.assigned_user_id = p_assignee_id)
    and (
      p_due_state is null
      or (p_due_state = 'overdue' and task.status in ('blocked', 'ready') and task.due_date < current_date)
      or (p_due_state = 'today' and task.status in ('blocked', 'ready') and task.due_date = current_date)
      or (p_due_state = 'future' and task.status in ('blocked', 'ready') and task.due_date > current_date)
      or (p_due_state = 'none' and (task.due_date is null or task.status not in ('blocked', 'ready')))
    )
    and (clean_query is null or strpos(lower(concat_ws(' ',
      task.reference, task.step_code, task.title, booking.reference, yacht.name
    )), clean_query) > 0);
  return result;
end;
$$;

revoke all on function public.list_offer_register_page(integer,timestamptz,uuid,public.offer_status,uuid,text) from public, anon;
revoke all on function public.count_offer_register(public.offer_status,uuid,text) from public, anon;
revoke all on function public.list_booking_register_page(integer,date,uuid,public.booking_status,uuid,text) from public, anon;
revoke all on function public.count_booking_register(public.booking_status,uuid,text) from public, anon;
revoke all on function public.list_task_register_page(integer,date,timestamptz,uuid,public.task_status,public.task_priority,text,uuid,boolean,text) from public, anon;
revoke all on function public.count_task_register(public.task_status,public.task_priority,text,uuid,boolean,text) from public, anon;

grant execute on function public.list_offer_register_page(integer,timestamptz,uuid,public.offer_status,uuid,text) to authenticated;
grant execute on function public.count_offer_register(public.offer_status,uuid,text) to authenticated;
grant execute on function public.list_booking_register_page(integer,date,uuid,public.booking_status,uuid,text) to authenticated;
grant execute on function public.count_booking_register(public.booking_status,uuid,text) to authenticated;
grant execute on function public.list_task_register_page(integer,date,timestamptz,uuid,public.task_status,public.task_priority,text,uuid,boolean,text) to authenticated;
grant execute on function public.count_task_register(public.task_status,public.task_priority,text,uuid,boolean,text) to authenticated;
