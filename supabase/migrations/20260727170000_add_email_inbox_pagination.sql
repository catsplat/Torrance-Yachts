-- The inbox is an operational register. Search and filtering must execute
-- against the whole authorised mailbox rather than a client-side 1,000-row cap.
create index email_messages_subject_lower_idx on public.email_messages (lower(subject));
create index email_messages_sender_name_lower_idx on public.email_messages (lower(sender_name));

create or replace function public.list_email_inbox_page(
  p_limit integer default 50,
  p_cursor_received_at timestamptz default null,
  p_cursor_id uuid default null,
  p_classification public.email_classification default null,
  p_query text default null
)
returns table (
  id uuid,
  thread_id uuid,
  received_at timestamptz,
  sender_name text,
  sender_email text,
  subject text,
  snippet text,
  has_attachments boolean,
  classification public.email_classification,
  processing_status public.email_processing_status,
  enquiry_id uuid,
  enquiry_reference text,
  enquiry_summary text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  clean_query text := nullif(lower(trim(coalesce(p_query, ''))), '');
begin
  if (p_cursor_received_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;

  return query
  select
    message.id, message.thread_id, message.received_at, message.sender_name,
    message.sender_email, message.subject, message.snippet, message.has_attachments,
    message.classification, message.processing_status, thread.enquiry_id,
    enquiry.reference, enquiry.summary
  from public.email_messages message
  join public.email_threads thread on thread.id = message.thread_id
  left join public.enquiries enquiry on enquiry.id = thread.enquiry_id
  where (p_classification is null or message.classification = p_classification)
    and (clean_query is null or strpos(lower(concat_ws(' ',
      message.sender_name, message.sender_email, message.subject, message.snippet
    )), clean_query) > 0)
    and (p_cursor_received_at is null or message.received_at < p_cursor_received_at
      or (message.received_at = p_cursor_received_at and message.id < p_cursor_id))
  order by message.received_at desc, message.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_email_inbox(
  p_classification public.email_classification default null,
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
  from public.email_messages message
  cross join values
  where (p_classification is null or message.classification = p_classification)
    and (values.clean_query is null or strpos(lower(concat_ws(' ',
      message.sender_name, message.sender_email, message.subject, message.snippet
    )), values.clean_query) > 0);
$$;

create or replace function public.count_email_inbox_review_required()
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select count(*) from public.email_messages
  where processing_status = 'review_required';
$$;

revoke all on function public.list_email_inbox_page(integer,timestamptz,uuid,public.email_classification,text) from public, anon;
revoke all on function public.count_email_inbox(public.email_classification,text) from public, anon;
revoke all on function public.count_email_inbox_review_required() from public, anon;
grant execute on function public.list_email_inbox_page(integer,timestamptz,uuid,public.email_classification,text) to authenticated;
grant execute on function public.count_email_inbox(public.email_classification,text) to authenticated;
grant execute on function public.count_email_inbox_review_required() to authenticated;
