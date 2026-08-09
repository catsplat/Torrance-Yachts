create or replace function public.list_active_enquiry_choices(
  p_query text,
  p_limit integer default 20
)
returns table (id uuid, reference text, summary text, status public.enquiry_status)
language sql stable security invoker set search_path = '' as $$
  select enquiry.id, enquiry.reference, enquiry.summary, enquiry.status
  from public.enquiries enquiry
  where enquiry.status in (
    'new', 'waiting_for_reply', 'offer_sent', 'negotiating',
    'contract_issued', 'awaiting_signatures', 'booked', 'charter_active'
  )
    and char_length(trim(coalesce(p_query, ''))) >= 2
    and (
      enquiry.reference ilike '%' || trim(p_query) || '%'
      or enquiry.summary ilike '%' || trim(p_query) || '%'
    )
  order by
    case when lower(enquiry.reference) = lower(trim(p_query)) then 0 else 1 end,
    enquiry.updated_at desc,
    enquiry.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

grant execute on function public.list_active_enquiry_choices(text, integer) to authenticated;

alter table public.documents
  add column quarantine_removed_at timestamptz;

alter table public.document_history
  drop constraint document_history_action_check;
alter table public.document_history
  add constraint document_history_action_check check (
    action in (
      'uploaded', 'quarantined', 'scan_started', 'scan_clean', 'scan_infected',
      'scan_error', 'released', 'verified', 'rejected', 'retention_flagged',
      'quarantine_removed'
    )
  );

comment on column public.documents.quarantine_removed_at is
  'Records the physical removal of a rejected, infected, or released quarantine object without deleting audit metadata.';

create index documents_quarantine_recovery_idx
  on public.documents (scan_status, created_at)
  where storage_bucket = 'booking-quarantine' and quarantine_removed_at is null;

create or replace function public.mark_document_quarantine_removed(
  p_document_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted document service required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 or char_length(trim(p_reason)) > 1000 then
    raise exception 'A bounded removal reason is required' using errcode = '22023';
  end if;
  update public.documents
  set quarantine_removed_at = coalesce(quarantine_removed_at, now())
  where id = p_document_id;
  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  insert into public.document_history(document_id, action, reason, changed_by)
  values (p_document_id, 'quarantine_removed', trim(p_reason), (select auth.uid()));
end;
$$;

revoke all on function public.mark_document_quarantine_removed(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_document_quarantine_removed(uuid, text) to service_role;

create or replace function public.redact_audit_json(p_value jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if p_value is null then return null; end if;
  if jsonb_typeof(p_value) = 'object' then
    select coalesce(jsonb_object_agg(entry.key,
      case
        when entry.key ~* '(body|content|token|secret|password|passport|iban|bank|payment|email|phone|address)'
          then to_jsonb('[redacted]'::text)
        else public.redact_audit_json(entry.value)
      end), '{}'::jsonb)
    into result from jsonb_each(p_value) entry;
    return result;
  elsif jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(public.redact_audit_json(entry.value)), '[]'::jsonb)
    into result from jsonb_array_elements(p_value) entry;
    return result;
  end if;
  return p_value;
end;
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
    public.redact_audit_json(event.old_values),
    public.redact_audit_json(event.new_values),
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

create or replace function public.get_operations_health()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'gmail', (
      select jsonb_build_object(
        'enabled', settings.enabled,
        'account_configured', settings.user_id is not null,
        'last_success_at', state.last_success_at,
        'last_failure_at', state.last_failure_at,
        'last_error', case when state.last_error is null then null else 'Gmail reconciliation requires attention.' end,
        'lag_seconds', case when state.last_success_at is null then null
          else extract(epoch from now() - state.last_success_at)::bigint end
      )
      from public.gmail_ingestion_settings settings
      left join public.gmail_reconciliation_states state on state.user_id = settings.user_id
      where settings.singleton
    ),
    'ai', (select public.get_ai_queue_health()),
    'outbox', jsonb_build_object(
      'pending', (select count(*) from public.integration_deliveries where status = 'pending'),
      'claimed', (select count(*) from public.integration_deliveries where status = 'claimed'),
      'failed', (select count(*) from public.integration_deliveries where status = 'failed'),
      'oldest_pending_at', (select min(created_at) from public.integration_deliveries
        where status in ('pending','claimed','failed')),
      'delivered_last_hour', (select count(*) from public.integration_deliveries
        where status = 'delivered' and delivered_at >= now() - interval '1 hour'),
      'average_latency_ms', (select round(avg(extract(epoch from delivered_at - created_at) * 1000))
        from public.integration_deliveries where status = 'delivered'
          and delivered_at >= now() - interval '24 hours')
    ),
    'scanner', jsonb_build_object(
      'pending', (select count(*) from public.documents where scan_status in ('pending','scanning')),
      'errors', (select count(*) from public.documents where scan_status = 'error'),
      'infected', (select count(*) from public.documents where scan_status = 'infected'),
      'orphan_candidates', (select count(*) from public.documents
        where quarantine_removed_at is null and (
          storage_bucket = 'booking-private' or scan_status = 'infected'
          or verification_status = 'rejected'
        )),
      'oldest_pending_at', (select min(created_at) from public.documents
        where scan_status in ('pending','scanning'))
    ),
    'retention', jsonb_build_object(
      'due', (select count(*) from public.documents
        where retention_review_due_at is not null and retention_review_due_at <= current_date)
    )
  );
end;
$$;

revoke all on function public.redact_audit_json(jsonb) from public, anon;
revoke all on function public.get_operations_health() from public, anon;
grant execute on function public.get_operations_health() to authenticated;
grant execute on function public.redact_audit_json(jsonb) to authenticated;
