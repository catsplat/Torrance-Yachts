create or replace function public.list_stale_enquiry_page(
  p_limit integer default 50,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_query text default null
)
returns table (
  id uuid, reference text, summary text, status public.enquiry_status,
  priority public.enquiry_priority, charter_start_date date, charter_end_date date,
  guest_count smallint, updated_at timestamptz, customer_name text, broker_name text,
  broker_company_name text, yacht_name text, owner_name text
)
language plpgsql security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit,50),100));
declare clean_query text := nullif(lower(trim(coalesce(p_query,''))), '');
begin
  if (p_cursor_updated_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  return query
  select enquiry.id, enquiry.reference, enquiry.summary, enquiry.status, enquiry.priority,
    enquiry.charter_start_date, enquiry.charter_end_date, enquiry.guest_count, enquiry.updated_at,
    customer.full_name, broker.full_name, company.name, yacht.name, owner.display_name
  from public.enquiries enquiry
  cross join public.operational_settings settings
  left join public.contacts customer on customer.id = enquiry.customer_contact_id
  left join public.contacts broker on broker.id = enquiry.broker_contact_id
  left join public.companies company on company.id = enquiry.broker_company_id
  left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
  left join public.profiles owner on owner.id = enquiry.owner_user_id
  where settings.enquiry_timeout_enabled
    and enquiry.status in ('new','waiting_for_reply','offer_sent','negotiating')
    and enquiry.updated_at <= now() - make_interval(days => case enquiry.status
      when 'new' then settings.new_enquiry_timeout_days
      when 'waiting_for_reply' then settings.waiting_reply_timeout_days
      when 'offer_sent' then settings.offer_sent_timeout_days
      else settings.negotiating_timeout_days end)
    and (clean_query is null or strpos(lower(concat_ws(' ', enquiry.reference,
      enquiry.summary, customer.full_name, broker.full_name, company.name, yacht.name)), clean_query) > 0)
    and (p_cursor_updated_at is null or enquiry.updated_at < p_cursor_updated_at
      or (enquiry.updated_at = p_cursor_updated_at and enquiry.id < p_cursor_id))
  order by enquiry.updated_at desc, enquiry.id desc limit clean_limit;
end;
$$;

create or replace function public.count_stale_enquiries(p_query text default null)
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*)
  from public.enquiries enquiry
  cross join public.operational_settings settings
  left join public.contacts customer on customer.id = enquiry.customer_contact_id
  left join public.contacts broker on broker.id = enquiry.broker_contact_id
  left join public.companies company on company.id = enquiry.broker_company_id
  left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
  where settings.enquiry_timeout_enabled
    and enquiry.status in ('new','waiting_for_reply','offer_sent','negotiating')
    and enquiry.updated_at <= now() - make_interval(days => case enquiry.status
      when 'new' then settings.new_enquiry_timeout_days
      when 'waiting_for_reply' then settings.waiting_reply_timeout_days
      when 'offer_sent' then settings.offer_sent_timeout_days
      else settings.negotiating_timeout_days end)
    and (nullif(lower(trim(coalesce(p_query,''))), '') is null
      or strpos(lower(concat_ws(' ', enquiry.reference, enquiry.summary,
        customer.full_name, broker.full_name, company.name, yacht.name)),
        lower(trim(p_query))) > 0)
$$;

create or replace function public.archive_stale_enquiries(p_enquiry_ids uuid[], p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare enquiry_id uuid;
declare archived integer := 0;
begin
  if not public.is_active_staff() then
    raise exception 'Active staff access is required' using errcode = '42501';
  end if;
  if coalesce(array_length(p_enquiry_ids,1),0) < 1 or array_length(p_enquiry_ids,1) > 50
    or char_length(trim(p_reason)) < 10 or char_length(trim(p_reason)) > 1000 then
    raise exception 'Select up to 50 stale enquiries and provide a clear reason' using errcode = '22023';
  end if;
  for enquiry_id in
    select enquiry.id
    from public.enquiries enquiry cross join public.operational_settings settings
    where enquiry.id = any(p_enquiry_ids)
      and settings.enquiry_timeout_enabled
      and enquiry.status in ('new','waiting_for_reply','offer_sent','negotiating')
      and enquiry.updated_at <= now() - make_interval(days => case enquiry.status
        when 'new' then settings.new_enquiry_timeout_days
        when 'waiting_for_reply' then settings.waiting_reply_timeout_days
        when 'offer_sent' then settings.offer_sent_timeout_days
        else settings.negotiating_timeout_days end)
    for update of enquiry
  loop
    perform public.transition_enquiry_status(enquiry_id, 'archived', trim(p_reason));
    archived := archived + 1;
  end loop;
  return archived;
end;
$$;

revoke all on function public.list_stale_enquiry_page(integer,timestamptz,uuid,text) from public, anon;
revoke all on function public.count_stale_enquiries(text) from public, anon;
revoke all on function public.archive_stale_enquiries(uuid[],text) from public, anon;
grant execute on function public.list_stale_enquiry_page(integer,timestamptz,uuid,text) to authenticated;
grant execute on function public.count_stale_enquiries(text) to authenticated;
grant execute on function public.archive_stale_enquiries(uuid[],text) to authenticated;
