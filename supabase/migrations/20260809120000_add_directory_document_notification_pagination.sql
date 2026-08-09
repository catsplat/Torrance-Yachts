create index if not exists contacts_register_order_idx
  on public.contacts ((lower(full_name)), id);
create index if not exists companies_register_order_idx
  on public.companies ((lower(name)), id);
create index if not exists documents_register_order_idx
  on public.documents (created_at desc, id desc);
create index if not exists documents_register_filters_idx
  on public.documents (document_type, scan_status, verification_status);
create index if not exists notifications_recipient_register_idx
  on public.notifications (recipient_user_id, created_at desc, id desc);

create or replace function public.list_contact_register_page(
  p_limit integer default 50,
  p_cursor_name text default null,
  p_cursor_id uuid default null,
  p_active boolean default true,
  p_role public.contact_role default null,
  p_query text default null
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  roles public.contact_role[],
  active boolean,
  updated_at timestamptz,
  sort_name text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_name is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select contact.id, contact.full_name, contact.email, contact.phone,
    contact.roles, contact.active, contact.updated_at, lower(contact.full_name)
  from public.contacts contact
  where (p_active is null or contact.active = p_active)
    and (p_role is null or p_role = any(contact.roles))
    and (clean_query is null or strpos(lower(concat_ws(' ',
      contact.full_name, contact.email, contact.phone,
      array_to_string(contact.roles, ' ')
    )), clean_query) > 0)
    and (
      p_cursor_name is null
      or lower(contact.full_name) > p_cursor_name
      or (lower(contact.full_name) = p_cursor_name and contact.id > p_cursor_id)
    )
  order by lower(contact.full_name), contact.id
  limit clean_limit;
end;
$$;

create or replace function public.count_contact_register(
  p_active boolean default true,
  p_role public.contact_role default null,
  p_query text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select count(*)
  from public.contacts contact
  where (p_active is null or contact.active = p_active)
    and (p_role is null or p_role = any(contact.roles))
    and (nullif(lower(trim(coalesce(p_query, ''))), '') is null or strpos(lower(concat_ws(' ',
      contact.full_name, contact.email, contact.phone,
      array_to_string(contact.roles, ' ')
    )), nullif(lower(trim(coalesce(p_query, ''))), '')) > 0);
$$;

create or replace function public.list_company_register_page(
  p_limit integer default 50,
  p_cursor_name text default null,
  p_cursor_id uuid default null,
  p_active boolean default true,
  p_query text default null
)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  website text,
  active boolean,
  updated_at timestamptz,
  sort_name text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_name is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select company.id, company.name, company.email, company.phone, company.website,
    company.active, company.updated_at, lower(company.name)
  from public.companies company
  where (p_active is null or company.active = p_active)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      company.name, company.email, company.phone, company.website
    )), clean_query) > 0)
    and (
      p_cursor_name is null
      or lower(company.name) > p_cursor_name
      or (lower(company.name) = p_cursor_name and company.id > p_cursor_id)
    )
  order by lower(company.name), company.id
  limit clean_limit;
end;
$$;

create or replace function public.count_company_register(
  p_active boolean default true,
  p_query text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select count(*)
  from public.companies company
  where (p_active is null or company.active = p_active)
    and (nullif(lower(trim(coalesce(p_query, ''))), '') is null or strpos(lower(concat_ws(' ',
      company.name, company.email, company.phone, company.website
    )), nullif(lower(trim(coalesce(p_query, ''))), '')) > 0);
$$;

create or replace function public.list_document_register_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_document_type public.document_type default null,
  p_scan_status public.document_scan_status default null,
  p_verification_status public.document_verification_status default null,
  p_query text default null
)
returns table (
  id uuid,
  booking_id uuid,
  document_type public.document_type,
  title text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  version_number integer,
  verification_status public.document_verification_status,
  scan_status public.document_scan_status,
  retention_class text,
  created_at timestamptz,
  booking_reference text,
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
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select document.id, document.booking_id, document.document_type,
    document.title, document.original_filename, document.mime_type,
    document.size_bytes, document.version_number, document.verification_status,
    document.scan_status, document.retention_class, document.created_at,
    booking.reference, yacht.name
  from public.documents document
  join public.bookings booking on booking.id = document.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  where (p_document_type is null or document.document_type = p_document_type)
    and (p_scan_status is null or document.scan_status = p_scan_status)
    and (p_verification_status is null or document.verification_status = p_verification_status)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      document.title, document.original_filename, booking.reference, yacht.name
    )), clean_query) > 0)
    and (
      p_cursor_created_at is null
      or document.created_at < p_cursor_created_at
      or (document.created_at = p_cursor_created_at and document.id < p_cursor_id)
    )
  order by document.created_at desc, document.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_document_register(
  p_document_type public.document_type default null,
  p_scan_status public.document_scan_status default null,
  p_verification_status public.document_verification_status default null,
  p_query text default null
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select count(*)
  from public.documents document
  join public.bookings booking on booking.id = document.booking_id
  join public.yachts yacht on yacht.id = booking.yacht_id
  where (p_document_type is null or document.document_type = p_document_type)
    and (p_scan_status is null or document.scan_status = p_scan_status)
    and (p_verification_status is null or document.verification_status = p_verification_status)
    and (nullif(lower(trim(coalesce(p_query, ''))), '') is null or strpos(lower(concat_ws(' ',
      document.title, document.original_filename, booking.reference, yacht.name
    )), nullif(lower(trim(coalesce(p_query, ''))), '')) > 0);
$$;

create or replace function public.list_my_notification_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_read boolean default null
)
returns table (
  id uuid,
  action_url text,
  body text,
  channel public.notification_channel,
  created_at timestamptz,
  priority public.notification_priority,
  read_at timestamptz,
  status public.notification_status,
  title text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select notification.id, notification.action_url, notification.body,
    notification.channel, notification.created_at, notification.priority,
    notification.read_at, notification.status, notification.title
  from public.notifications notification
  where notification.recipient_user_id = (select auth.uid())
    and (p_read is null or (notification.read_at is not null) = p_read)
    and (
      p_cursor_created_at is null
      or notification.created_at < p_cursor_created_at
      or (notification.created_at = p_cursor_created_at and notification.id < p_cursor_id)
    )
  order by notification.created_at desc, notification.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_my_notifications(p_read boolean default null)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select count(*)
  from public.notifications notification
  where notification.recipient_user_id = (select auth.uid())
    and (p_read is null or (notification.read_at is not null) = p_read);
$$;

revoke all on function public.list_contact_register_page(integer,text,uuid,boolean,public.contact_role,text) from public, anon;
revoke all on function public.count_contact_register(boolean,public.contact_role,text) from public, anon;
revoke all on function public.list_company_register_page(integer,text,uuid,boolean,text) from public, anon;
revoke all on function public.count_company_register(boolean,text) from public, anon;
revoke all on function public.list_document_register_page(integer,timestamptz,uuid,public.document_type,public.document_scan_status,public.document_verification_status,text) from public, anon;
revoke all on function public.count_document_register(public.document_type,public.document_scan_status,public.document_verification_status,text) from public, anon;
revoke all on function public.list_my_notification_page(integer,timestamptz,uuid,boolean) from public, anon;
revoke all on function public.count_my_notifications(boolean) from public, anon;

grant execute on function public.list_contact_register_page(integer,text,uuid,boolean,public.contact_role,text) to authenticated;
grant execute on function public.count_contact_register(boolean,public.contact_role,text) to authenticated;
grant execute on function public.list_company_register_page(integer,text,uuid,boolean,text) to authenticated;
grant execute on function public.count_company_register(boolean,text) to authenticated;
grant execute on function public.list_document_register_page(integer,timestamptz,uuid,public.document_type,public.document_scan_status,public.document_verification_status,text) to authenticated;
grant execute on function public.count_document_register(public.document_type,public.document_scan_status,public.document_verification_status,text) to authenticated;
grant execute on function public.list_my_notification_page(integer,timestamptz,uuid,boolean) to authenticated;
grant execute on function public.count_my_notifications(boolean) to authenticated;
