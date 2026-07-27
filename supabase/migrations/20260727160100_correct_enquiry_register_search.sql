-- Corrects the function in local development databases where the preceding
-- migration was applied before its literal substring search was finalised.
create or replace function public.list_enquiry_register_page(
  p_limit integer default 50,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status public.enquiry_status default null,
  p_open_only boolean default false,
  p_priority public.enquiry_priority default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns table (
  id uuid, reference text, summary text, status public.enquiry_status,
  priority public.enquiry_priority, charter_start_date date, charter_end_date date,
  guest_count smallint, updated_at timestamptz, customer_name text, broker_name text,
  broker_company_name text, yacht_name text, owner_name text
)
language plpgsql security invoker set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  if p_open_only and p_status is not null then
    raise exception 'Choose either an explicit status or the open lifecycle' using errcode = '22023';
  end if;
  return query
  select enquiry.id, enquiry.reference, enquiry.summary, enquiry.status, enquiry.priority,
    enquiry.charter_start_date, enquiry.charter_end_date, enquiry.guest_count, enquiry.updated_at,
    customer.full_name, broker.full_name, broker_company.name, yacht.name, owner.display_name
  from public.enquiries enquiry
  left join public.contacts customer on customer.id = enquiry.customer_contact_id
  left join public.contacts broker on broker.id = enquiry.broker_contact_id
  left join public.companies broker_company on broker_company.id = enquiry.broker_company_id
  left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
  left join public.profiles owner on owner.id = enquiry.owner_user_id
  where (not p_open_only or enquiry.status in (
      'new', 'waiting_for_reply', 'offer_sent', 'negotiating',
      'contract_issued', 'awaiting_signatures', 'booked', 'charter_active'
    ))
    and (p_status is null or enquiry.status = p_status)
    and (p_priority is null or enquiry.priority = p_priority)
    and (p_yacht_id is null or enquiry.requested_yacht_id = p_yacht_id)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      enquiry.reference, enquiry.summary, customer.full_name, broker.full_name,
      broker_company.name, yacht.name, owner.display_name
    )), clean_query) > 0)
    and (p_cursor_updated_at is null or enquiry.updated_at < p_cursor_updated_at
      or (enquiry.updated_at = p_cursor_updated_at and enquiry.id < p_cursor_id))
  order by enquiry.updated_at desc, enquiry.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_enquiry_register(
  p_status public.enquiry_status default null,
  p_open_only boolean default false,
  p_priority public.enquiry_priority default null,
  p_yacht_id uuid default null,
  p_query text default null
)
returns bigint language sql security invoker set search_path = ''
as $$
  with values as (
    select nullif(lower(trim(coalesce(p_query, ''))), '') as clean_query
  )
  select count(*)
  from public.enquiries enquiry
  left join public.contacts customer on customer.id = enquiry.customer_contact_id
  left join public.contacts broker on broker.id = enquiry.broker_contact_id
  left join public.companies broker_company on broker_company.id = enquiry.broker_company_id
  left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
  left join public.profiles owner on owner.id = enquiry.owner_user_id
  cross join values
  where (not p_open_only or enquiry.status in (
      'new', 'waiting_for_reply', 'offer_sent', 'negotiating',
      'contract_issued', 'awaiting_signatures', 'booked', 'charter_active'
    ))
    and (p_status is null or enquiry.status = p_status)
    and (p_priority is null or enquiry.priority = p_priority)
    and (p_yacht_id is null or enquiry.requested_yacht_id = p_yacht_id)
    and (values.clean_query is null or strpos(lower(concat_ws(' ',
      enquiry.reference, enquiry.summary, customer.full_name, broker.full_name,
      broker_company.name, yacht.name, owner.display_name
    )), values.clean_query) > 0);
$$;
