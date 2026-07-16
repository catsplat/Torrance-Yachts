-- Phase 9: idempotent email ingestion, deterministic routing, manual review, and enquiry timeouts.

create type public.email_classification as enum (
  'unclassified',
  'new_enquiry',
  'enquiry_follow_up',
  'internal',
  'circular',
  'other_relevant'
);
create type public.email_processing_status as enum (
  'received', 'review_required', 'classified', 'linked', 'ignored'
);
create type public.email_provider_action_type as enum ('mark_read', 'archive');
create type public.email_provider_action_status as enum ('pending', 'completed', 'failed');

create table public.operational_settings (
  id boolean primary key default true check (id),
  enquiry_timeout_enabled boolean not null default true,
  new_enquiry_timeout_days integer not null default 14 check (new_enquiry_timeout_days between 1 and 365),
  waiting_reply_timeout_days integer not null default 30 check (waiting_reply_timeout_days between 1 and 365),
  offer_sent_timeout_days integer not null default 30 check (offer_sent_timeout_days between 1 and 365),
  negotiating_timeout_days integer not null default 45 check (negotiating_timeout_days between 1 and 365),
  internal_email_domains text[] not null default '{}'::text[],
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.operational_settings (id) values (true);

create table public.email_threads (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'gmail' check (provider = 'gmail'),
  provider_thread_id text not null,
  enquiry_id uuid references public.enquiries (id) on delete restrict,
  subject text not null check (char_length(trim(subject)) between 1 and 998),
  participants text[] not null default '{}'::text[],
  first_message_at timestamptz not null,
  last_message_at timestamptz not null,
  message_count integer not null default 0 check (message_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_thread_id)
);

create index email_threads_enquiry_idx on public.email_threads (enquiry_id, last_message_at desc);
create index email_threads_last_message_idx on public.email_threads (last_message_at desc);

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads (id) on delete restrict,
  provider text not null default 'gmail' check (provider = 'gmail'),
  provider_message_id text not null,
  internet_message_id text,
  received_at timestamptz not null,
  sender_name text,
  sender_email text not null check (sender_email = lower(sender_email) and sender_email like '%@%'),
  recipient_emails text[] not null default '{}'::text[],
  cc_emails text[] not null default '{}'::text[],
  subject text not null check (char_length(trim(subject)) between 1 and 998),
  snippet text not null default '' check (char_length(snippet) <= 2000),
  body_text text not null default '' check (char_length(body_text) <= 200000),
  gmail_label_ids text[] not null default '{}'::text[],
  has_attachments boolean not null default false,
  classification public.email_classification not null default 'unclassified',
  processing_status public.email_processing_status not null default 'received',
  deterministic_rule text,
  classified_by uuid references public.profiles (id) on delete set null,
  classified_at timestamptz,
  classification_reason text check (
    classification_reason is null or char_length(trim(classification_reason)) between 2 and 2000
  ),
  created_at timestamptz not null default now(),
  unique (provider, provider_message_id),
  constraint email_classification_fields check (
    (classification = 'unclassified' and classified_at is null)
    or (classification <> 'unclassified' and classified_at is not null)
  )
);

create index email_messages_status_received_idx
  on public.email_messages (processing_status, received_at desc);
create index email_messages_sender_idx on public.email_messages (sender_email, received_at desc);
create index email_messages_thread_idx on public.email_messages (thread_id, received_at);

create table public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.email_messages (id) on delete restrict,
  provider_attachment_id text not null,
  filename text not null check (char_length(trim(filename)) between 1 and 255),
  mime_type text not null check (char_length(trim(mime_type)) between 3 and 255),
  size_bytes bigint not null check (size_bytes between 0 and 52428800),
  storage_status text not null default 'metadata_only'
    check (storage_status in ('metadata_only', 'quarantined', 'stored', 'rejected')),
  created_at timestamptz not null default now(),
  unique (message_id, provider_attachment_id)
);

create table public.email_ingestion_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  provider_message_id text not null,
  message_id uuid references public.email_messages (id) on delete restrict,
  status text not null check (status in ('received', 'completed', 'failed')),
  error_code text,
  received_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.email_classification_history (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.email_messages (id) on delete restrict,
  from_classification public.email_classification,
  to_classification public.email_classification not null,
  reason text not null check (char_length(trim(reason)) between 2 and 2000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index email_classification_history_message_idx
  on public.email_classification_history (message_id, created_at desc);

create table public.email_provider_actions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.email_messages (id) on delete restrict,
  action_type public.email_provider_action_type not null,
  status public.email_provider_action_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, action_type)
);

create index email_provider_actions_pending_idx
  on public.email_provider_actions (status, created_at) where status in ('pending', 'failed');

create or replace function public.normalise_email_address(value text)
returns text language sql immutable set search_path = '' as $$
  select lower(trim(value));
$$;

create or replace function public.email_domain(value text)
returns text language sql immutable set search_path = '' as $$
  select split_part(public.normalise_email_address(value), '@', 2);
$$;

create or replace function public.guard_phase9_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.phase9_command', true), '') <> 'yes' then
    raise exception 'Use an approved email or settings command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_operational_settings before update or delete on public.operational_settings
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_threads before insert or update or delete on public.email_threads
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_messages before insert or update or delete on public.email_messages
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_attachments before insert or update or delete on public.email_attachments
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_ingestion_events before insert or update or delete on public.email_ingestion_events
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_classification_history before insert or update or delete on public.email_classification_history
  for each row execute function public.guard_phase9_direct_mutation();
create trigger guard_email_provider_actions before insert or update or delete on public.email_provider_actions
  for each row execute function public.guard_phase9_direct_mutation();

create or replace function public.ingest_gmail_message(
  p_provider_event_id text,
  p_provider_message_id text,
  p_provider_thread_id text,
  p_internet_message_id text,
  p_received_at timestamptz,
  p_sender_name text,
  p_sender_email text,
  p_recipient_emails text[],
  p_cc_emails text[],
  p_subject text,
  p_snippet text,
  p_body_text text,
  p_gmail_label_ids text[],
  p_has_attachments boolean,
  p_has_list_unsubscribe boolean,
  p_has_list_id boolean,
  p_is_bulk boolean,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing_event public.email_ingestion_events;
  thread_record public.email_threads;
  created_message_id uuid;
  selected_classification public.email_classification := 'unclassified'::public.email_classification;
  selected_status public.email_processing_status := 'review_required'::public.email_processing_status;
  selected_rule text := 'manual_review';
  sender_domain text;
  settings_record public.operational_settings;
  attachment jsonb;
begin
  select * into existing_event
  from public.email_ingestion_events where provider_event_id = trim(p_provider_event_id);
  if found and existing_event.message_id is not null then return existing_event.message_id; end if;

  select id into created_message_id from public.email_messages
  where provider = 'gmail' and provider_message_id = trim(p_provider_message_id);
  if found then
    perform set_config('app.phase9_command', 'yes', true);
    insert into public.email_ingestion_events (
      provider_event_id, provider_message_id, message_id, status, completed_at
    ) values (
      trim(p_provider_event_id), trim(p_provider_message_id), created_message_id, 'completed', now()
    ) on conflict (provider_event_id) do update
      set message_id = excluded.message_id, status = 'completed', completed_at = now();
    perform set_config('app.phase9_command', '', true);
    return created_message_id;
  end if;

  select * into settings_record from public.operational_settings where id;
  sender_domain := public.email_domain(p_sender_email);

  select * into thread_record from public.email_threads
  where provider = 'gmail' and provider_thread_id = trim(p_provider_thread_id);

  if found and thread_record.enquiry_id is not null then
    selected_classification := 'enquiry_follow_up';
    selected_status := 'linked';
    selected_rule := 'existing_enquiry_thread';
  elsif p_has_list_unsubscribe or p_has_list_id or p_is_bulk then
    selected_classification := 'circular';
    selected_status := 'ignored';
    selected_rule := 'mailing_list_headers';
  elsif sender_domain = any(settings_record.internal_email_domains) then
    selected_classification := 'internal';
    selected_status := 'classified';
    selected_rule := 'configured_internal_domain';
  end if;

  perform set_config('app.phase9_command', 'yes', true);
  insert into public.email_ingestion_events (
    provider_event_id, provider_message_id, status
  ) values (trim(p_provider_event_id), trim(p_provider_message_id), 'received')
  on conflict (provider_event_id) do nothing;

  insert into public.email_threads (
    provider_thread_id, enquiry_id, subject, participants,
    first_message_at, last_message_at, message_count
  ) values (
    trim(p_provider_thread_id), thread_record.enquiry_id, trim(p_subject),
    array_remove(array_cat(
      array[public.normalise_email_address(p_sender_email)],
      coalesce(p_recipient_emails, '{}'::text[]) || coalesce(p_cc_emails, '{}'::text[])
    ), null),
    p_received_at, p_received_at, 0
  )
  on conflict (provider, provider_thread_id) do update set
    subject = excluded.subject,
    participants = (
      select array_agg(distinct item)
      from unnest(public.email_threads.participants || excluded.participants) item
    ),
    last_message_at = greatest(public.email_threads.last_message_at, excluded.last_message_at),
    updated_at = now()
  returning * into thread_record;

  insert into public.email_messages (
    thread_id, provider_message_id, internet_message_id, received_at,
    sender_name, sender_email, recipient_emails, cc_emails, subject, snippet,
    body_text, gmail_label_ids, has_attachments, classification,
    processing_status, deterministic_rule, classified_at, classification_reason
  ) values (
    thread_record.id, trim(p_provider_message_id), nullif(trim(p_internet_message_id), ''),
    p_received_at, nullif(trim(p_sender_name), ''), public.normalise_email_address(p_sender_email),
    coalesce(p_recipient_emails, '{}'::text[]), coalesce(p_cc_emails, '{}'::text[]),
    trim(p_subject), left(coalesce(p_snippet, ''), 2000),
    left(coalesce(p_body_text, ''), 200000), coalesce(p_gmail_label_ids, '{}'::text[]),
    p_has_attachments, selected_classification, selected_status, selected_rule,
    case when selected_classification = 'unclassified' then null else now() end,
    case when selected_classification = 'unclassified' then null else 'Deterministic Phase 9 routing' end
  ) returning id into created_message_id;

  update public.email_threads set message_count = message_count + 1 where id = thread_record.id;

  for attachment in select value from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb))
  loop
    insert into public.email_attachments (
      message_id, provider_attachment_id, filename, mime_type, size_bytes
    ) values (
      created_message_id,
      attachment->>'provider_attachment_id',
      attachment->>'filename',
      attachment->>'mime_type',
      coalesce((attachment->>'size_bytes')::bigint, 0)
    ) on conflict do nothing;
  end loop;

  if selected_classification = 'circular' then
    insert into public.email_provider_actions (message_id, action_type)
    values (created_message_id, 'mark_read'), (created_message_id, 'archive')
    on conflict do nothing;
  end if;

  if selected_classification = 'enquiry_follow_up' then
    insert into public.enquiry_notes (enquiry_id, kind, body)
    values (
      thread_record.enquiry_id, 'follow_up',
      left('Email follow-up from ' || public.normalise_email_address(p_sender_email) ||
        ': ' || trim(p_subject) || E'\n\n' || coalesce(p_snippet, ''), 10000)
    );
    update public.enquiries set updated_at = now() where id = thread_record.enquiry_id;
  end if;

  insert into public.email_classification_history (
    message_id, from_classification, to_classification, reason
  ) values (created_message_id, null, selected_classification, 'Initial deterministic routing');

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, payload
  ) values (
    'EmailReceived', 'email_message', created_message_id,
    jsonb_build_object(
      'provider_message_id', trim(p_provider_message_id),
      'classification', selected_classification,
      'processing_status', selected_status,
      'deterministic_rule', selected_rule
    )
  );

  update public.email_ingestion_events
  set message_id = created_message_id, status = 'completed', completed_at = now()
  where provider_event_id = trim(p_provider_event_id);
  perform set_config('app.phase9_command', '', true);
  return created_message_id;
exception when others then
  perform set_config('app.phase9_command', 'yes', true);
  insert into public.email_ingestion_events (
    provider_event_id, provider_message_id, status, error_code, completed_at
  ) values (
    trim(p_provider_event_id), trim(p_provider_message_id), 'failed', sqlstate, now()
  ) on conflict (provider_event_id) do update
    set status = 'failed', error_code = sqlstate, completed_at = now();
  perform set_config('app.phase9_command', '', true);
  raise;
end;
$$;

create or replace function public.classify_email_message(
  p_message_id uuid,
  p_classification public.email_classification,
  p_reason text,
  p_enquiry_id uuid default null,
  p_contact_id uuid default null,
  p_enquiry_summary text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  message_record public.email_messages;
  thread_record public.email_threads;
  linked_enquiry_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_classification = 'unclassified' then
    raise exception 'Choose an operational classification' using errcode = '22023';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A classification reason is required' using errcode = '22023';
  end if;
  select * into message_record from public.email_messages where id = p_message_id for update;
  if not found then raise exception 'Email message not found' using errcode = 'P0002'; end if;
  select * into thread_record from public.email_threads where id = message_record.thread_id for update;

  if p_classification = 'new_enquiry' then
    if char_length(trim(coalesce(p_enquiry_summary, ''))) < 2 then
      raise exception 'An enquiry summary is required' using errcode = '23514';
    end if;
    if thread_record.enquiry_id is not null then
      raise exception 'This thread is already linked to an enquiry' using errcode = '23514';
    end if;
    linked_enquiry_id := p_contact_id;
    if linked_enquiry_id is null then
      select id into linked_enquiry_id
      from public.contacts
      where active and email = message_record.sender_email
      order by created_at limit 1;
    end if;
    if linked_enquiry_id is null then
      insert into public.contacts (full_name, email, roles, notes)
      values (
        coalesce(nullif(trim(message_record.sender_name), ''), message_record.sender_email),
        message_record.sender_email,
        array['customer','charterer']::public.contact_role[],
        'Created after human approval of an email-originated enquiry.'
      ) returning id into linked_enquiry_id;
    end if;
    insert into public.enquiries (
      customer_contact_id, status, priority, source, summary, created_by, updated_by
    ) values (
      linked_enquiry_id, 'new', 'normal', 'email', trim(p_enquiry_summary),
      (select auth.uid()), (select auth.uid())
    ) returning id into linked_enquiry_id;
  elsif p_classification = 'enquiry_follow_up' then
    linked_enquiry_id := coalesce(p_enquiry_id, thread_record.enquiry_id);
    if linked_enquiry_id is null or not exists (
      select 1 from public.enquiries where id = linked_enquiry_id
    ) then
      raise exception 'Select an existing enquiry for the follow-up' using errcode = '23514';
    end if;
  end if;

  perform set_config('app.phase9_command', 'yes', true);
  update public.email_messages set
    classification = p_classification,
    processing_status = case
      when p_classification = 'circular' then 'ignored'::public.email_processing_status
      when p_classification in ('new_enquiry', 'enquiry_follow_up') then 'linked'::public.email_processing_status
      else 'classified'::public.email_processing_status
    end,
    deterministic_rule = 'human_review',
    classified_by = (select auth.uid()),
    classified_at = now(),
    classification_reason = trim(p_reason)
  where id = p_message_id;

  if linked_enquiry_id is not null then
    update public.email_threads set enquiry_id = linked_enquiry_id, updated_at = now()
    where id = thread_record.id;
    update public.enquiries set updated_at = now() where id = linked_enquiry_id;
  end if;
  if p_classification = 'enquiry_follow_up' then
    insert into public.enquiry_notes (enquiry_id, kind, body, created_by, updated_by)
    values (
      linked_enquiry_id, 'follow_up',
      left('Email follow-up from ' || message_record.sender_email || ': ' ||
        message_record.subject || E'\n\n' || message_record.snippet, 10000),
      (select auth.uid()), (select auth.uid())
    );
  end if;
  if p_classification = 'circular' then
    insert into public.email_provider_actions (message_id, action_type)
    values (p_message_id, 'mark_read'), (p_message_id, 'archive')
    on conflict do nothing;
  end if;
  insert into public.email_classification_history (
    message_id, from_classification, to_classification, reason, changed_by
  ) values (
    p_message_id, message_record.classification, p_classification,
    trim(p_reason), (select auth.uid())
  );
  perform set_config('app.phase9_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'EmailClassified', 'email_message', p_message_id, (select auth.uid()),
    jsonb_build_object(
      'classification', p_classification,
      'enquiry_id', linked_enquiry_id,
      'reason', trim(p_reason)
    )
  );
  return linked_enquiry_id;
end;
$$;

create or replace function public.update_operational_settings(
  p_enquiry_timeout_enabled boolean,
  p_new_enquiry_timeout_days integer,
  p_waiting_reply_timeout_days integer,
  p_offer_sent_timeout_days integer,
  p_negotiating_timeout_days integer,
  p_internal_email_domains text[]
)
returns public.operational_settings language plpgsql security definer set search_path = '' as $$
declare updated_record public.operational_settings;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  perform set_config('app.phase9_command', 'yes', true);
  update public.operational_settings set
    enquiry_timeout_enabled = p_enquiry_timeout_enabled,
    new_enquiry_timeout_days = p_new_enquiry_timeout_days,
    waiting_reply_timeout_days = p_waiting_reply_timeout_days,
    offer_sent_timeout_days = p_offer_sent_timeout_days,
    negotiating_timeout_days = p_negotiating_timeout_days,
    internal_email_domains = (
      select coalesce(array_agg(distinct lower(trim(domain))) filter (where trim(domain) <> ''), '{}'::text[])
      from unnest(coalesce(p_internal_email_domains, '{}'::text[])) domain
    ),
    updated_by = (select auth.uid()),
    updated_at = now()
  where id
  returning * into updated_record;
  perform set_config('app.phase9_command', '', true);
  return updated_record;
end;
$$;

create or replace function public.apply_enquiry_timeouts(p_as_of timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare
  settings_record public.operational_settings;
  enquiry_record public.enquiries;
  timeout_days integer;
  archived_count integer := 0;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  select * into settings_record from public.operational_settings where id;
  if not settings_record.enquiry_timeout_enabled then return 0; end if;

  for enquiry_record in
    select * from public.enquiries
    where status in ('new', 'waiting_for_reply', 'offer_sent', 'negotiating')
    order by updated_at
    for update skip locked
  loop
    timeout_days := case enquiry_record.status
      when 'new' then settings_record.new_enquiry_timeout_days
      when 'waiting_for_reply' then settings_record.waiting_reply_timeout_days
      when 'offer_sent' then settings_record.offer_sent_timeout_days
      when 'negotiating' then settings_record.negotiating_timeout_days
    end;
    if enquiry_record.updated_at <= p_as_of - make_interval(days => timeout_days) then
      perform public.transition_enquiry_status(
        enquiry_record.id, 'archived',
        'Automatically archived after ' || timeout_days ||
        ' days without recorded activity; configurable in Settings'
      );
      archived_count := archived_count + 1;
    end if;
  end loop;
  if archived_count > 0 then
    insert into public.workflow_events (
      event_type, aggregate_type, aggregate_id, actor_user_id, payload
    ) values (
      'EnquiryTimeoutSweepCompleted', 'user', (select auth.uid()), (select auth.uid()),
      jsonb_build_object('archived_count', archived_count, 'as_of', p_as_of)
    );
  end if;
  return archived_count;
end;
$$;

alter table public.operational_settings enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_attachments enable row level security;
alter table public.email_ingestion_events enable row level security;
alter table public.email_classification_history enable row level security;
alter table public.email_provider_actions enable row level security;

create policy "active staff read operational settings" on public.operational_settings
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email threads" on public.email_threads
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email messages" on public.email_messages
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email attachments" on public.email_attachments
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email ingestion events" on public.email_ingestion_events
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email classification history" on public.email_classification_history
  for select to authenticated using ((select public.is_active_staff()));
create policy "active staff read email provider actions" on public.email_provider_actions
  for select to authenticated using ((select public.is_active_staff()));

revoke all on public.operational_settings, public.email_threads, public.email_messages,
  public.email_attachments, public.email_ingestion_events,
  public.email_classification_history, public.email_provider_actions
  from public, anon;
grant select on public.operational_settings, public.email_threads, public.email_messages,
  public.email_attachments, public.email_ingestion_events,
  public.email_classification_history, public.email_provider_actions
  to authenticated;
grant select on public.operational_settings, public.email_threads, public.email_messages,
  public.email_attachments, public.email_ingestion_events,
  public.email_classification_history, public.email_provider_actions
  to service_role;
grant select on public.workflow_events, public.enquiries, public.enquiry_notes
  to service_role;

revoke all on function public.ingest_gmail_message(
  text,text,text,text,timestamptz,text,text,text[],text[],text,text,text,text[],boolean,
  boolean,boolean,boolean,jsonb
) from public, anon, authenticated;
grant execute on function public.ingest_gmail_message(
  text,text,text,text,timestamptz,text,text,text[],text[],text,text,text,text[],boolean,
  boolean,boolean,boolean,jsonb
) to service_role;
revoke all on function public.classify_email_message(
  uuid,public.email_classification,text,uuid,uuid,text
) from public, anon;
grant execute on function public.classify_email_message(
  uuid,public.email_classification,text,uuid,uuid,text
) to authenticated;
revoke all on function public.update_operational_settings(
  boolean,integer,integer,integer,integer,text[]
) from public, anon;
grant execute on function public.update_operational_settings(
  boolean,integer,integer,integer,integer,text[]
) to authenticated;
revoke all on function public.apply_enquiry_timeouts(timestamptz) from public, anon;
grant execute on function public.apply_enquiry_timeouts(timestamptz) to authenticated;
