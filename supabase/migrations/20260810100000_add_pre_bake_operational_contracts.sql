-- Pre-bake correctness contracts: exact dashboard totals, bounded search,
-- paginated review/delivery history, document duplicate protection and
-- an administrator audit register.

create extension if not exists pg_trgm with schema extensions;

create index if not exists enquiries_summary_trgm_idx
  on public.enquiries using gin (lower(summary) extensions.gin_trgm_ops);
create index if not exists tasks_title_trgm_idx
  on public.tasks using gin (lower(title) extensions.gin_trgm_ops);
create index if not exists email_subject_trgm_idx
  on public.email_messages using gin (lower(subject) extensions.gin_trgm_ops);
create index if not exists ai_suggestions_register_idx
  on public.ai_suggestions (created_at desc, id desc);
create index if not exists integration_deliveries_register_idx
  on public.integration_deliveries (created_at desc, id desc);
create index if not exists audit_events_register_idx
  on public.audit_events (created_at desc, id desc);
create unique index if not exists documents_requirement_content_unique_idx
  on public.documents (booking_id, document_type, content_sha256)
  where content_sha256 is not null;

create or replace function public.get_workspace_dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'enquiries', jsonb_build_object(
      'open', (select count(*) from public.enquiries where status in (
        'new', 'waiting_for_reply', 'offer_sent', 'negotiating',
        'contract_issued', 'awaiting_signatures'
      )),
      'new', (select count(*) from public.enquiries where status = 'new'),
      'waiting_for_reply', (select count(*) from public.enquiries where status = 'waiting_for_reply'),
      'offer_sent', (select count(*) from public.enquiries where status = 'offer_sent'),
      'negotiating', (select count(*) from public.enquiries where status = 'negotiating'),
      'contract_issued', (select count(*) from public.enquiries where status = 'contract_issued'),
      'awaiting_signatures', (select count(*) from public.enquiries where status = 'awaiting_signatures')
    ),
    'offers', jsonb_build_object(
      'awaiting_approval', (select count(*) from public.offers where status = 'draft'),
      'approved_not_sent', (select count(*) from public.offers where status = 'approved')
    ),
    'bookings', jsonb_build_object(
      'active', (select count(*) from public.bookings where status in ('confirmed', 'charter_active')),
      'yachtfolio_pending', (
        select count(*) from public.yachtfolio_booking_actions action
        join public.bookings booking on booking.id = action.booking_id
        where action.status = 'pending' and booking.status in ('confirmed', 'charter_active')
      )
    ),
    'tasks', jsonb_build_object(
      'open', (select count(*) from public.tasks where status in ('ready', 'blocked')),
      'overdue', (select count(*) from public.tasks where status = 'ready' and due_date < current_date)
    ),
    'documents', jsonb_build_object(
      'missing_required', (select count(*) from public.booking_document_requirements where required and status = 'missing'),
      'awaiting_review', (select count(*) from public.booking_document_requirements where status = 'uploaded')
    ),
    'payments', jsonb_build_object(
      'scheduled', (select count(*) from public.payment_schedules where status = 'scheduled'),
      'overdue', (select count(*) from public.payment_schedules where status = 'scheduled' and due_date < current_date)
    ),
    'email', jsonb_build_object(
      'review_required', (select count(*) from public.email_messages where processing_status = 'review_required'),
      'relevant_received', (select count(*) from public.email_messages where classification <> 'circular')
    ),
    'ai', jsonb_build_object(
      'pending_review', (select count(*) from public.ai_suggestions where status = 'pending_review'),
      'queued', (select count(*) from public.ai_runs where status in ('queued', 'processing')),
      'oldest_queued_at', (select min(requested_at) from public.ai_runs where status in ('queued', 'processing'))
    ),
    'integrations', jsonb_build_object(
      'pending_approval', (select count(*) from public.notifications where status = 'pending_approval'),
      'failed_deliveries', (select count(*) from public.integration_deliveries where status = 'failed'),
      'oldest_pending_at', (select min(created_at) from public.integration_deliveries where status in ('pending', 'failed', 'claimed'))
    ),
    'scanner', jsonb_build_object(
      'pending', (select count(*) from public.documents where scan_status in ('pending', 'scanning')),
      'errors', (select count(*) from public.documents where scan_status = 'error'),
      'oldest_pending_at', (select min(created_at) from public.documents where scan_status in ('pending', 'scanning'))
    )
  );
$$;

create or replace function public.search_workspace(
  p_query text,
  p_limit_per_type integer default 8
)
returns table (
  entity_type text,
  entity_id uuid,
  primary_label text,
  secondary_label text,
  status_label text,
  href text,
  total_count bigint,
  rank integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select nullif(lower(trim(p_query)), '') query,
      greatest(1, least(coalesce(p_limit_per_type, 8), 25)) item_limit
  ), candidates as (
    select 'enquiry'::text entity_type, id entity_id, reference primary_label,
      summary secondary_label, status::text status_label, '/enquiries/' || id href,
      updated_at sort_at
    from public.enquiries, params
    where params.query is not null and lower(reference || ' ' || summary) like '%' || params.query || '%'
    union all
    select 'booking', booking.id, booking.reference, yacht.name, booking.status::text,
      '/bookings/' || booking.id, booking.updated_at
    from public.bookings booking join public.yachts yacht on yacht.id = booking.yacht_id, params
    where params.query is not null and lower(concat_ws(' ', booking.reference, yacht.name,
      booking.embarkation_port, booking.disembarkation_port)) like '%' || params.query || '%'
    union all
    select 'task', id, title, coalesce(step_code, 'Operational task'), status::text,
      '/tasks/' || id, updated_at
    from public.tasks, params
    where params.query is not null and lower(concat_ws(' ', reference, title, step_code)) like '%' || params.query || '%'
    union all
    select 'yacht', id, name, coalesce(builder, 'Builder not recorded'), status::text,
      '/yachts/' || id, updated_at
    from public.yachts, params
    where params.query is not null and lower(concat_ws(' ', name, builder)) like '%' || params.query || '%'
    union all
    select 'contact', id, full_name, coalesce(email, 'No email'), 'contact',
      '/contacts/' || id, updated_at
    from public.contacts, params
    where params.query is not null and lower(concat_ws(' ', full_name, email, phone)) like '%' || params.query || '%'
    union all
    select 'email', id, subject, sender_email, classification::text,
      '/emails/' || id, received_at
    from public.email_messages, params
    where params.query is not null and lower(concat_ws(' ', subject, sender_email)) like '%' || params.query || '%'
  ), ranked as (
    select candidates.*,
      count(*) over (partition by entity_type) total_count,
      row_number() over (partition by entity_type order by sort_at desc, entity_id desc)::integer rank
    from candidates
  )
  select entity_type, entity_id, primary_label, secondary_label, status_label,
    href, total_count, rank
  from ranked, params
  where rank <= params.item_limit
  order by entity_type, rank;
$$;

create or replace function public.list_ai_review_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status public.ai_suggestion_status default null
)
returns table (
  id uuid, source_type text, source_id uuid,
  analysis_kind public.ai_analysis_kind, summary text, confidence numeric,
  status public.ai_suggestion_status, created_at timestamptz,
  provider text, model text, source_label text, href text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  return query
  select suggestion.id, suggestion.source_type, suggestion.source_id,
    suggestion.analysis_kind, suggestion.summary, suggestion.confidence,
    suggestion.status, suggestion.created_at, run.provider, run.model,
    case when suggestion.source_type = 'email_message'
      then coalesce(email.subject || ' · ' || email.sender_email, 'Email message')
      else coalesce(booking.reference || ' · ' || document.title, 'Charter agreement') end,
    case when suggestion.source_type = 'email_message'
      then '/emails/' || suggestion.source_id
      else coalesce('/bookings/' || document.booking_id || '/documents', '/documents') end
  from public.ai_suggestions suggestion
  join public.ai_runs run on run.id = suggestion.run_id
  left join public.email_messages email
    on suggestion.source_type = 'email_message' and email.id = suggestion.source_id
  left join public.documents document
    on suggestion.source_type = 'document' and document.id = suggestion.source_id
  left join public.bookings booking on booking.id = document.booking_id
  where (p_status is null or suggestion.status = p_status)
    and (p_cursor_created_at is null or suggestion.created_at < p_cursor_created_at
      or (suggestion.created_at = p_cursor_created_at and suggestion.id < p_cursor_id))
  order by suggestion.created_at desc, suggestion.id desc
  limit clean_limit;
end;
$$;

create or replace function public.count_ai_review(p_status public.ai_suggestion_status default null)
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.ai_suggestions where p_status is null or status = p_status;
$$;

create or replace function public.list_integration_delivery_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_status public.integration_delivery_status default null,
  p_provider public.integration_provider default null
)
returns setof public.integration_deliveries
language plpgsql stable security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  return query select delivery.* from public.integration_deliveries delivery
  where (p_status is null or delivery.status = p_status)
    and (p_provider is null or delivery.provider = p_provider)
    and (p_cursor_created_at is null or delivery.created_at < p_cursor_created_at
      or (delivery.created_at = p_cursor_created_at and delivery.id < p_cursor_id))
  order by delivery.created_at desc, delivery.id desc limit clean_limit;
end;
$$;

create or replace function public.count_integration_deliveries(
  p_status public.integration_delivery_status default null,
  p_provider public.integration_provider default null
)
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.integration_deliveries
  where (p_status is null or status = p_status) and (p_provider is null or provider = p_provider);
$$;

create or replace function public.list_audit_event_page(
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id bigint default null,
  p_actor_user_id uuid default null,
  p_entity_type text default null,
  p_action text default null
)
returns table (
  id bigint, actor_user_id uuid, actor_name text, action text,
  entity_type text, entity_id uuid, old_values jsonb, new_values jsonb,
  source text, created_at timestamptz
)
language plpgsql stable security invoker set search_path = '' as $$
declare clean_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception 'Pagination cursor is incomplete' using errcode = '22023';
  end if;
  return query select event.id, event.actor_user_id, profile.display_name,
    event.action, event.entity_type, event.entity_id,
    event.old_values - array['body','content','access_token','refresh_token','payment_instructions'],
    event.new_values - array['body','content','access_token','refresh_token','payment_instructions'],
    event.source, event.created_at
  from public.audit_events event
  left join public.profiles profile on profile.id = event.actor_user_id
  where (p_actor_user_id is null or event.actor_user_id = p_actor_user_id)
    and (p_entity_type is null or event.entity_type = p_entity_type)
    and (p_action is null or event.action = p_action)
    and (p_cursor_created_at is null or event.created_at < p_cursor_created_at
      or (event.created_at = p_cursor_created_at and event.id < p_cursor_id))
  order by event.created_at desc, event.id desc limit clean_limit;
end;
$$;

create or replace function public.count_audit_events(
  p_actor_user_id uuid default null,
  p_entity_type text default null,
  p_action text default null
)
returns bigint language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return (select count(*) from public.audit_events event
    where (p_actor_user_id is null or event.actor_user_id = p_actor_user_id)
      and (p_entity_type is null or event.entity_type = p_entity_type)
      and (p_action is null or event.action = p_action));
end;
$$;

revoke all on function public.get_workspace_dashboard_summary() from public, anon;
revoke all on function public.search_workspace(text,integer) from public, anon;
revoke all on function public.list_ai_review_page(integer,timestamptz,uuid,public.ai_suggestion_status) from public, anon;
revoke all on function public.count_ai_review(public.ai_suggestion_status) from public, anon;
revoke all on function public.list_integration_delivery_page(integer,timestamptz,uuid,public.integration_delivery_status,public.integration_provider) from public, anon;
revoke all on function public.count_integration_deliveries(public.integration_delivery_status,public.integration_provider) from public, anon;
revoke all on function public.list_audit_event_page(integer,timestamptz,bigint,uuid,text,text) from public, anon;
revoke all on function public.count_audit_events(uuid,text,text) from public, anon;

grant execute on function public.get_workspace_dashboard_summary() to authenticated;
grant execute on function public.search_workspace(text,integer) to authenticated;
grant execute on function public.list_ai_review_page(integer,timestamptz,uuid,public.ai_suggestion_status) to authenticated;
grant execute on function public.count_ai_review(public.ai_suggestion_status) to authenticated;
grant execute on function public.list_integration_delivery_page(integer,timestamptz,uuid,public.integration_delivery_status,public.integration_provider) to authenticated;
grant execute on function public.count_integration_deliveries(public.integration_delivery_status,public.integration_provider) to authenticated;
grant execute on function public.list_audit_event_page(integer,timestamptz,bigint,uuid,text,text) to authenticated;
grant execute on function public.count_audit_events(uuid,text,text) to authenticated;
