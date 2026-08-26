-- Imported Gmail messages belong to the staff member whose connected mailbox
-- supplied them.  An email thread becomes company-visible only after it is
-- explicitly linked to an operational enquiry.

alter table public.email_threads
  add column owner_user_id uuid references public.profiles (id) on delete restrict,
  add column shared_at timestamptz,
  add column shared_by uuid references public.profiles (id) on delete set null;

alter table public.email_messages
  add column owner_user_id uuid references public.profiles (id) on delete restrict;

alter table public.email_ingestion_events
  add column owner_user_id uuid references public.profiles (id) on delete restrict;

-- Existing production rows must come from the explicitly selected mailbox.
-- Keep the migration fail-closed if that ownership cannot be recovered rather
-- than assigning private mail to an administrator as a convenience.
select set_config('app.phase9_command', 'yes', true);

update public.email_threads thread
set owner_user_id = coalesce(
  (select settings.user_id
   from public.gmail_ingestion_settings settings
   where settings.singleton and settings.enabled)
)
where thread.owner_user_id is null;

update public.email_messages message
set owner_user_id = thread.owner_user_id
from public.email_threads thread
where thread.id = message.thread_id
  and message.owner_user_id is null;

update public.email_ingestion_events event
set owner_user_id = message.owner_user_id
from public.email_messages message
where message.id = event.message_id
  and event.owner_user_id is null;

update public.email_threads
set shared_at = coalesce(shared_at, updated_at)
where enquiry_id is not null and shared_at is null;

select set_config('app.phase9_command', '', true);

do $$
begin
  if exists (select 1 from public.email_threads where owner_user_id is null)
    or exists (select 1 from public.email_messages where owner_user_id is null)
    or exists (select 1 from public.email_ingestion_events where owner_user_id is null)
  then
    raise exception 'Email mailbox ownership could not be recovered; configure the selected Gmail mailbox before deploying this migration.';
  end if;
end;
$$;

alter table public.email_threads alter column owner_user_id set not null;
alter table public.email_messages alter column owner_user_id set not null;
alter table public.email_ingestion_events alter column owner_user_id set not null;

alter table public.email_threads
  drop constraint email_threads_provider_provider_thread_id_key;
alter table public.email_messages
  drop constraint email_messages_provider_provider_message_id_key;
alter table public.email_ingestion_events
  drop constraint email_ingestion_events_provider_event_id_key;

alter table public.email_threads
  add constraint email_threads_owner_provider_thread_unique
  unique (owner_user_id, provider, provider_thread_id);
alter table public.email_messages
  add constraint email_messages_owner_provider_message_unique
  unique (owner_user_id, provider, provider_message_id);
alter table public.email_ingestion_events
  add constraint email_ingestion_events_owner_provider_event_unique
  unique (owner_user_id, provider_event_id);

create index email_threads_owner_visibility_idx
  on public.email_threads (owner_user_id, shared_at, last_message_at desc);
create index email_messages_owner_received_idx
  on public.email_messages (owner_user_id, received_at desc);
create index email_ingestion_events_owner_received_idx
  on public.email_ingestion_events (owner_user_id, received_at desc);

create or replace function public.guard_email_owner_consistency()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'email_messages' then
    if not exists (
      select 1 from public.email_threads thread
      where thread.id = new.thread_id and thread.owner_user_id = new.owner_user_id
    ) then
      raise exception 'Email message ownership must match its thread' using errcode = '23514';
    end if;
  end if;
  if tg_table_name = 'email_ingestion_events' then
    if new.message_id is not null then
      if not exists (
        select 1 from public.email_messages message
        where message.id = new.message_id and message.owner_user_id = new.owner_user_id
      ) then
        raise exception 'Ingestion event ownership must match its message' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Email mailbox ownership is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_email_thread_owner
  before update on public.email_threads
  for each row execute function public.guard_email_owner_consistency();
create trigger guard_email_message_owner
  before insert or update on public.email_messages
  for each row execute function public.guard_email_owner_consistency();
create trigger guard_email_ingestion_event_owner
  before insert or update on public.email_ingestion_events
  for each row execute function public.guard_email_owner_consistency();

-- The legacy service-role entry point remains available for older local
-- fixtures. Production and application-owned callers use the explicit wrapper
-- below, which sets the owner from the selected connected account.
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
  selected_owner_user_id uuid;
  selected_classification public.email_classification := 'unclassified'::public.email_classification;
  selected_status public.email_processing_status := 'review_required'::public.email_processing_status;
  selected_rule text := 'manual_review';
  sender_domain text;
  settings_record public.operational_settings;
  attachment jsonb;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted ingestion service required' using errcode = '42501';
  end if;

  selected_owner_user_id := nullif(current_setting('app.email_owner_user_id', true), '')::uuid;
  if selected_owner_user_id is null then
    select settings.user_id into selected_owner_user_id
    from public.gmail_ingestion_settings settings
    where settings.singleton and settings.enabled;
  end if;
  if selected_owner_user_id is null then
    -- Compatibility for pre-privacy synthetic database fixtures only.
    select profile.id into selected_owner_user_id
    from public.profiles profile
    where profile.active and profile.role = 'administrator'
    order by profile.created_at, profile.id
    limit 1;
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = selected_owner_user_id
      and profile.active and profile.access_approved_at is not null
  ) then
    raise exception 'An approved active mailbox owner is required' using errcode = '42501';
  end if;

  select * into existing_event
  from public.email_ingestion_events
  where owner_user_id = selected_owner_user_id
    and provider_event_id = trim(p_provider_event_id);
  if found and existing_event.message_id is not null then return existing_event.message_id; end if;

  select id into created_message_id from public.email_messages
  where owner_user_id = selected_owner_user_id
    and provider = 'gmail'
    and provider_message_id = trim(p_provider_message_id);
  if found then
    perform set_config('app.phase9_command', 'yes', true);
    insert into public.email_ingestion_events (
      owner_user_id, provider_event_id, provider_message_id, message_id, status, completed_at
    ) values (
      selected_owner_user_id, trim(p_provider_event_id), trim(p_provider_message_id),
      created_message_id, 'completed', now()
    ) on conflict (owner_user_id, provider_event_id) do update
      set message_id = excluded.message_id, status = 'completed', completed_at = now();
    perform set_config('app.phase9_command', '', true);
    return created_message_id;
  end if;

  select * into settings_record from public.operational_settings where id;
  sender_domain := public.email_domain(p_sender_email);

  select * into thread_record from public.email_threads
  where owner_user_id = selected_owner_user_id
    and provider = 'gmail'
    and provider_thread_id = trim(p_provider_thread_id);

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
    owner_user_id, provider_event_id, provider_message_id, status
  ) values (
    selected_owner_user_id, trim(p_provider_event_id), trim(p_provider_message_id), 'received'
  ) on conflict (owner_user_id, provider_event_id) do nothing;

  insert into public.email_threads (
    owner_user_id, provider_thread_id, enquiry_id, subject, participants,
    first_message_at, last_message_at, message_count, shared_at
  ) values (
    selected_owner_user_id, trim(p_provider_thread_id), thread_record.enquiry_id, trim(p_subject),
    array_remove(array_cat(
      array[public.normalise_email_address(p_sender_email)],
      coalesce(p_recipient_emails, '{}'::text[]) || coalesce(p_cc_emails, '{}'::text[])
    ), null),
    p_received_at, p_received_at, 0,
    case when thread_record.enquiry_id is not null then now() else null end
  )
  on conflict (owner_user_id, provider, provider_thread_id) do update set
    subject = excluded.subject,
    participants = (
      select array_agg(distinct item)
      from unnest(public.email_threads.participants || excluded.participants) item
    ),
    last_message_at = greatest(public.email_threads.last_message_at, excluded.last_message_at),
    shared_at = case
      when public.email_threads.enquiry_id is not null
        then coalesce(public.email_threads.shared_at, now())
      else public.email_threads.shared_at
    end,
    updated_at = now()
  returning * into thread_record;

  insert into public.email_messages (
    owner_user_id, thread_id, provider_message_id, internet_message_id, received_at,
    sender_name, sender_email, recipient_emails, cc_emails, subject, snippet,
    body_text, gmail_label_ids, has_attachments, classification,
    processing_status, deterministic_rule, classified_at, classification_reason
  ) values (
    selected_owner_user_id, thread_record.id, trim(p_provider_message_id),
    nullif(trim(p_internet_message_id), ''), p_received_at,
    nullif(trim(p_sender_name), ''), public.normalise_email_address(p_sender_email),
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
      'deterministic_rule', selected_rule,
      'owner_user_id', selected_owner_user_id
    )
  );

  update public.email_ingestion_events
  set message_id = created_message_id, status = 'completed', completed_at = now()
  where owner_user_id = selected_owner_user_id
    and provider_event_id = trim(p_provider_event_id);
  perform set_config('app.phase9_command', '', true);
  return created_message_id;
exception when others then
  perform set_config('app.phase9_command', 'yes', true);
  if selected_owner_user_id is not null then
    insert into public.email_ingestion_events (
      owner_user_id, provider_event_id, provider_message_id, status, error_code, completed_at
    ) values (
      selected_owner_user_id, trim(p_provider_event_id), trim(p_provider_message_id),
      'failed', sqlstate, now()
    ) on conflict (owner_user_id, provider_event_id) do update
      set status = 'failed', error_code = sqlstate, completed_at = now();
  end if;
  perform set_config('app.phase9_command', '', true);
  raise;
end;
$$;

create or replace function public.ingest_gmail_message_for_owner(
  p_owner_user_id uuid,
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
  result_id uuid;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted ingestion service required' using errcode = '42501';
  end if;
  if p_owner_user_id is null then
    raise exception 'An email mailbox owner is required' using errcode = '22023';
  end if;
  perform set_config('app.email_owner_user_id', p_owner_user_id::text, true);
  result_id := public.ingest_gmail_message(
    p_provider_event_id, p_provider_message_id, p_provider_thread_id,
    p_internet_message_id, p_received_at, p_sender_name, p_sender_email,
    p_recipient_emails, p_cc_emails, p_subject, p_snippet, p_body_text,
    p_gmail_label_ids, p_has_attachments, p_has_list_unsubscribe,
    p_has_list_id, p_is_bulk, p_attachments
  );
  perform set_config('app.email_owner_user_id', '', true);
  return result_id;
exception when others then
  perform set_config('app.email_owner_user_id', '', true);
  raise;
end;
$$;

create or replace function public.can_read_email_message(p_message_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1
    from public.email_messages message
    join public.email_threads thread on thread.id = message.thread_id
    where message.id = p_message_id
      and public.is_active_staff()
      and (
        message.owner_user_id = (select auth.uid())
        or thread.shared_at is not null
      )
  );
$$;

drop policy if exists "active staff read email threads" on public.email_threads;
drop policy if exists "active staff read email messages" on public.email_messages;
drop policy if exists "active staff read email attachments" on public.email_attachments;
drop policy if exists "active staff read email ingestion events" on public.email_ingestion_events;
drop policy if exists "active staff read email classification history" on public.email_classification_history;
drop policy if exists "active staff read email provider actions" on public.email_provider_actions;

create policy "users read owned or shared email threads" on public.email_threads
  for select to authenticated using (
    (select public.is_active_staff())
    and (owner_user_id = (select auth.uid()) or shared_at is not null)
  );
create policy "users read owned or shared email messages" on public.email_messages
  for select to authenticated using (
    (select public.is_active_staff())
    and (
      owner_user_id = (select auth.uid())
      or exists (
        select 1 from public.email_threads thread
        where thread.id = email_messages.thread_id and thread.shared_at is not null
      )
    )
  );
create policy "users read owned or shared email attachments" on public.email_attachments
  for select to authenticated using ((select public.can_read_email_message(message_id)));
create policy "users read owned or shared email ingestion events" on public.email_ingestion_events
  for select to authenticated using (
    owner_user_id = (select auth.uid())
    or (message_id is not null and (select public.can_read_email_message(message_id)))
  );
create policy "users read owned or shared email history" on public.email_classification_history
  for select to authenticated using ((select public.can_read_email_message(message_id)));
create policy "users read owned or shared email provider actions" on public.email_provider_actions
  for select to authenticated using ((select public.can_read_email_message(message_id)));

-- Classification is the human-controlled promotion point. A staff member may
-- classify their own mailbox content; once linked to an enquiry, the thread is
-- shared and other staff may continue the operational workflow.
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
  if message_record.owner_user_id <> (select auth.uid()) and thread_record.shared_at is null then
    raise exception 'Only the connected mailbox owner can review this private email' using errcode = '42501';
  end if;

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
    update public.email_threads set
      enquiry_id = linked_enquiry_id,
      shared_at = coalesce(shared_at, now()),
      shared_by = coalesce(shared_by, (select auth.uid())),
      updated_at = now()
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

-- Do not expose AI triage generated from a private message to unrelated staff.
drop policy if exists "active staff read AI runs" on public.ai_runs;
drop policy if exists "active staff read AI suggestions" on public.ai_suggestions;
drop policy if exists "active staff read AI evidence" on public.ai_suggestion_evidence;
drop policy if exists "active staff read AI revisions" on public.ai_suggestion_revisions;
create policy "users read permitted AI runs" on public.ai_runs for select to authenticated
  using (
    (select public.is_active_staff())
    and (source_type <> 'email_message' or (select public.can_read_email_message(source_id)))
  );
create policy "users read permitted AI suggestions" on public.ai_suggestions for select to authenticated
  using (
    (select public.is_active_staff())
    and (source_type <> 'email_message' or (select public.can_read_email_message(source_id)))
  );
create policy "users read permitted AI evidence" on public.ai_suggestion_evidence for select to authenticated
  using (
    (select public.is_active_staff())
    and (
      source_type <> 'email_message'
      or (select public.can_read_email_message(source_id))
    )
  );
create policy "users read permitted AI revisions" on public.ai_suggestion_revisions for select to authenticated
  using (
    (select public.is_active_staff())
    and exists (
      select 1 from public.ai_suggestions suggestion
      where suggestion.id = ai_suggestion_revisions.suggestion_id
        and (suggestion.source_type <> 'email_message'
          or public.can_read_email_message(suggestion.source_id))
    )
  );

-- The existing materialiser loops through all profiles. A trigger boundary
-- makes that implementation privacy-safe without changing unrelated task,
-- payment, booking, or integration notification branches.
create or replace function public.guard_private_email_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type = 'email_message' and new.recipient_user_id is not null
    and exists (
      select 1
      from public.email_messages message
      join public.email_threads thread on thread.id = message.thread_id
      where message.id = new.source_id
        and thread.shared_at is null
        and message.owner_user_id <> new.recipient_user_id
    ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger guard_private_email_notification
  before insert on public.notifications
  for each row execute function public.guard_private_email_notification();

select set_config('app.phase11_command', 'yes', true);
delete from public.notifications notification
using public.email_messages message
join public.email_threads thread on thread.id = message.thread_id
where notification.source_type = 'email_message'
  and notification.source_id = message.id
  and thread.shared_at is null
  and message.owner_user_id <> notification.recipient_user_id;
select set_config('app.phase11_command', '', true);

-- AI work is always processed under the mailbox owner's identity.
create or replace function public.claim_ai_email_work(p_worker_id text, p_limit integer default 5)
returns table (work_id uuid, claimed_source_id uuid, owner_user_id uuid, attempt_count integer)
language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted automation service required' using errcode = '42501';
  end if;
  if char_length(trim(p_worker_id)) < 2 or p_limit < 1 or p_limit > 20 then
    raise exception 'Invalid claim parameters' using errcode = '22023';
  end if;
  insert into public.ai_work_queue(source_id, owner_user_id)
  select message.id, message.owner_user_id
  from public.email_messages message
  where message.classification = 'unclassified'
    and message.processing_status = 'review_required'
    and not exists (select 1 from public.ai_work_queue work where work.source_id = message.id)
    and not exists (select 1 from public.ai_runs run where run.source_type = 'email_message'
      and run.source_id = message.id and run.status = 'completed')
  order by message.received_at limit 100
  on conflict on constraint ai_work_queue_source_id_key do nothing;

  return query with candidates as (
    select id from public.ai_work_queue
    where (status = 'pending' and next_attempt_at <= now())
      or (status = 'claimed' and lease_expires_at <= now())
    order by next_attempt_at, created_at for update skip locked limit p_limit
  )
  update public.ai_work_queue work set status = 'claimed',
    attempt_count = least(work.attempt_count + 1, 5), claimed_by = trim(p_worker_id),
    claimed_at = now(), lease_expires_at = now() + interval '2 minutes', updated_at = now()
  from candidates where work.id = candidates.id
  returning work.id, work.source_id, work.owner_user_id, work.attempt_count;
end;
$$;

-- Keep the existing permissions but expose the explicit owner-aware ingestion
-- entry point only to the trusted server-side automation role.
revoke all on function public.ingest_gmail_message_for_owner(
  uuid,text,text,text,text,timestamptz,text,text,text[],text[],text,text,text,text[],boolean,
  boolean,boolean,boolean,jsonb
) from public, anon, authenticated;
grant execute on function public.ingest_gmail_message_for_owner(
  uuid,text,text,text,text,timestamptz,text,text,text[],text[],text,text,text,text[],boolean,
  boolean,boolean,boolean,jsonb
) to service_role;
revoke all on function public.can_read_email_message(uuid) from public, anon;
grant execute on function public.can_read_email_message(uuid) to authenticated;
