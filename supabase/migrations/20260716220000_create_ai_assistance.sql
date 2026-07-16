-- Phase 10: provider-neutral AI suggestions, evidence, human review, and communication templates.

create type public.ai_analysis_kind as enum ('email_triage', 'contract_extraction');
create type public.ai_run_status as enum ('queued', 'processing', 'completed', 'failed');
create type public.ai_suggestion_status as enum (
  'pending_review', 'approved', 'rejected', 'superseded'
);
create type public.communication_template_kind as enum (
  'kyc_request', 'captain_contact', 'broker_follow_up'
);
create type public.communication_template_status as enum ('draft', 'approved', 'retired');

create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  kind public.communication_template_kind not null,
  version_number integer not null check (version_number > 0),
  name text not null check (char_length(trim(name)) between 2 and 160),
  subject_template text not null check (char_length(trim(subject_template)) between 2 and 300),
  body_template text not null check (char_length(trim(body_template)) between 20 and 30000),
  status public.communication_template_status not null default 'draft',
  source_template_id uuid references public.communication_templates (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete restrict,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, version_number),
  constraint communication_template_approval_fields check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or (status <> 'approved')
  )
);

create unique index communication_templates_one_approved_idx
  on public.communication_templates (kind) where status = 'approved';

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique check (char_length(request_key) between 16 and 500),
  analysis_kind public.ai_analysis_kind not null,
  source_type text not null check (source_type in ('email_message', 'document')),
  source_id uuid not null,
  provider text not null check (provider ~ '^[a-z][a-z0-9_-]{1,49}$'),
  model text not null check (char_length(model) between 2 and 160),
  prompt_version text not null check (prompt_version ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  input_sha256 text not null check (input_sha256 ~ '^[0-9a-f]{64}$'),
  status public.ai_run_status not null default 'queued',
  requested_by uuid not null references public.profiles (id) on delete restrict,
  provider_request_id text check (
    provider_request_id is null or char_length(provider_request_id) between 1 and 500
  ),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text check (error_code is null or char_length(error_code) between 1 and 100),
  error_message text check (error_message is null or char_length(error_message) between 1 and 1000),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint ai_run_source_kind check (
    (analysis_kind = 'email_triage' and source_type = 'email_message')
    or (analysis_kind = 'contract_extraction' and source_type = 'document')
  ),
  constraint ai_run_lifecycle_fields check (
    (status = 'queued' and started_at is null and completed_at is null)
    or (status = 'processing' and started_at is not null and completed_at is null)
    or (status in ('completed', 'failed') and started_at is not null and completed_at is not null)
  ),
  constraint ai_run_error_fields check (
    (status = 'failed' and error_code is not null)
    or (status <> 'failed' and error_code is null and error_message is null)
  )
);

create index ai_runs_source_idx
  on public.ai_runs (source_type, source_id, requested_at desc);
create index ai_runs_status_idx
  on public.ai_runs (status, requested_at desc);

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.ai_runs (id) on delete restrict,
  analysis_kind public.ai_analysis_kind not null,
  source_type text not null check (source_type in ('email_message', 'document')),
  source_id uuid not null,
  provider_payload jsonb not null check (
    jsonb_typeof(provider_payload) = 'object'
    and octet_length(provider_payload::text) <= 200000
  ),
  reviewed_payload jsonb not null check (
    jsonb_typeof(reviewed_payload) = 'object'
    and octet_length(reviewed_payload::text) <= 200000
  ),
  summary text not null check (char_length(trim(summary)) between 2 and 5000),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  status public.ai_suggestion_status not null default 'pending_review',
  reviewed_by uuid references public.profiles (id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text check (
    review_reason is null or char_length(trim(review_reason)) between 2 and 2000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_suggestion_source_kind check (
    (analysis_kind = 'email_triage' and source_type = 'email_message')
    or (analysis_kind = 'contract_extraction' and source_type = 'document')
  ),
  constraint ai_suggestion_review_fields check (
    (
      status in ('approved', 'rejected')
      and reviewed_by is not null
      and reviewed_at is not null
      and review_reason is not null
    )
    or (
      status in ('pending_review', 'superseded')
      and reviewed_by is null
      and reviewed_at is null
      and review_reason is null
    )
  )
);

create index ai_suggestions_source_idx
  on public.ai_suggestions (source_type, source_id, created_at desc);
create index ai_suggestions_review_idx
  on public.ai_suggestions (status, created_at desc);

create table public.ai_suggestion_evidence (
  id bigint generated always as identity primary key,
  suggestion_id uuid not null references public.ai_suggestions (id) on delete restrict,
  field_path text not null check (field_path ~ '^[a-z][a-z0-9_.]{0,159}$'),
  source_type text not null check (source_type in ('email_message', 'document', 'yacht_record')),
  source_id uuid not null,
  excerpt text not null check (char_length(trim(excerpt)) between 1 and 1000),
  start_offset integer check (start_offset is null or start_offset >= 0),
  end_offset integer check (end_offset is null or end_offset > 0),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  constraint ai_evidence_offsets check (
    (start_offset is null and end_offset is null)
    or (start_offset is not null and end_offset is not null and end_offset > start_offset)
  )
);

create index ai_suggestion_evidence_suggestion_idx
  on public.ai_suggestion_evidence (suggestion_id, field_path);

create table public.ai_suggestion_revisions (
  id bigint generated always as identity primary key,
  suggestion_id uuid not null references public.ai_suggestions (id) on delete restrict,
  previous_payload jsonb not null check (jsonb_typeof(previous_payload) = 'object'),
  revised_payload jsonb not null check (jsonb_typeof(revised_payload) = 'object'),
  reason text not null check (char_length(trim(reason)) between 2 and 2000),
  changed_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index ai_suggestion_revisions_suggestion_idx
  on public.ai_suggestion_revisions (suggestion_id, created_at desc);

alter table public.communication_templates enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.ai_suggestion_evidence enable row level security;
alter table public.ai_suggestion_revisions enable row level security;

create or replace function public.guard_phase10_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.phase10_command', true), '') <> 'yes' then
    raise exception 'Use an approved AI or communication-template command'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_communication_templates
  before insert or update or delete on public.communication_templates
  for each row execute function public.guard_phase10_direct_mutation();
create trigger guard_ai_runs
  before insert or update or delete on public.ai_runs
  for each row execute function public.guard_phase10_direct_mutation();
create trigger guard_ai_suggestions
  before insert or update or delete on public.ai_suggestions
  for each row execute function public.guard_phase10_direct_mutation();
create trigger guard_ai_suggestion_evidence
  before insert or update or delete on public.ai_suggestion_evidence
  for each row execute function public.guard_phase10_direct_mutation();
create trigger guard_ai_suggestion_revisions
  before insert or update or delete on public.ai_suggestion_revisions
  for each row execute function public.guard_phase10_direct_mutation();

create or replace function public.validate_communication_template_placeholders(
  p_kind public.communication_template_kind,
  p_subject text,
  p_body text
)
returns void language plpgsql immutable set search_path = '' as $$
declare
  placeholder_match text[];
  allowed text[];
begin
  allowed := case p_kind
    when 'kyc_request' then array[
      'broker_company_name', 'client_name', 'year',
      'passport_country', 'residency_country'
    ]
    when 'captain_contact' then array[
      'broker_name', 'yacht_name', 'captain_name', 'captain_email', 'captain_phone'
    ]
    when 'broker_follow_up' then array[
      'broker_name', 'yacht_name', 'charter_start_date', 'charter_end_date'
    ]
  end;
  for placeholder_match in
    select regexp_matches(coalesce(p_subject, '') || E'\n' || coalesce(p_body, ''),
      '\{\{([a-z_]+)\}\}', 'g')
  loop
    if not (placeholder_match[1] = any(allowed)) then
      raise exception 'Unknown communication template placeholder: %', placeholder_match[1]
        using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function public.create_communication_template_draft(
  p_kind public.communication_template_kind,
  p_name text,
  p_subject_template text,
  p_body_template text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  created_id uuid;
  next_version integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  perform public.validate_communication_template_placeholders(
    p_kind, p_subject_template, p_body_template
  );
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.communication_templates where kind = p_kind;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.communication_templates (
    kind, version_number, name, subject_template, body_template, created_by, updated_by
  ) values (
    p_kind, next_version, trim(p_name), trim(p_subject_template),
    trim(p_body_template), (select auth.uid()), (select auth.uid())
  ) returning id into created_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'CommunicationTemplateDraftCreated', 'communication_template', created_id,
    (select auth.uid()), jsonb_build_object('kind', p_kind, 'version_number', next_version)
  );
  return created_id;
end;
$$;

create or replace function public.clone_communication_template(
  p_source_template_id uuid,
  p_name text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  source_record public.communication_templates;
  created_id uuid;
  next_version integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  select * into source_record
  from public.communication_templates where id = p_source_template_id;
  if not found then raise exception 'Communication template not found' using errcode = 'P0002'; end if;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.communication_templates where kind = source_record.kind;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.communication_templates (
    kind, version_number, name, subject_template, body_template,
    source_template_id, created_by, updated_by
  ) values (
    source_record.kind, next_version, trim(p_name), source_record.subject_template,
    source_record.body_template, source_record.id, (select auth.uid()), (select auth.uid())
  ) returning id into created_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'CommunicationTemplateCloned', 'communication_template', created_id,
    (select auth.uid()), jsonb_build_object(
      'source_template_id', source_record.id,
      'kind', source_record.kind,
      'version_number', next_version
    )
  );
  return created_id;
end;
$$;

create or replace function public.update_communication_template_draft(
  p_template_id uuid,
  p_name text,
  p_subject_template text,
  p_body_template text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.communication_templates;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  select * into target from public.communication_templates
  where id = p_template_id and status = 'draft' for update;
  if not found then raise exception 'Editable communication template not found' using errcode = 'P0002'; end if;
  perform public.validate_communication_template_placeholders(
    target.kind, p_subject_template, p_body_template
  );
  perform set_config('app.phase10_command', 'yes', true);
  update public.communication_templates set
    name = trim(p_name),
    subject_template = trim(p_subject_template),
    body_template = trim(p_body_template),
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = p_template_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'CommunicationTemplateDraftUpdated', 'communication_template', p_template_id,
    (select auth.uid()), jsonb_build_object('kind', target.kind)
  );
end;
$$;

create or replace function public.approve_communication_template(p_template_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.communication_templates;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  select * into target from public.communication_templates
  where id = p_template_id and status = 'draft' for update;
  if not found then raise exception 'Draft communication template not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase10_command', 'yes', true);
  update public.communication_templates set
    status = 'retired', updated_by = (select auth.uid()), updated_at = now()
  where kind = target.kind and status = 'approved';
  update public.communication_templates set
    status = 'approved',
    approved_by = (select auth.uid()),
    approved_at = now(),
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = p_template_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'CommunicationTemplateApproved', 'communication_template', p_template_id,
    (select auth.uid()), jsonb_build_object(
      'kind', target.kind, 'version_number', target.version_number
    )
  );
end;
$$;

create or replace function public.request_ai_analysis(
  p_request_key text,
  p_analysis_kind public.ai_analysis_kind,
  p_source_type text,
  p_source_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_sha256 text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  run_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_analysis_kind = 'email_triage' and (
    p_source_type <> 'email_message'
    or not exists (select 1 from public.email_messages where id = p_source_id)
  ) then
    raise exception 'Email analysis requires an existing email message' using errcode = '23514';
  end if;
  if p_analysis_kind = 'contract_extraction' and (
    p_source_type <> 'document'
    or not exists (
      select 1 from public.documents
      where id = p_source_id
        and document_type = 'charter_agreement'
        and verification_status = 'verified'
    )
  ) then
    raise exception 'Contract extraction requires a verified charter agreement'
      using errcode = '23514';
  end if;
  select id into run_id from public.ai_runs where request_key = trim(p_request_key);
  if found then return run_id; end if;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.ai_runs (
    request_key, analysis_kind, source_type, source_id, provider, model,
    prompt_version, input_sha256, requested_by
  ) values (
    trim(p_request_key), p_analysis_kind, p_source_type, p_source_id,
    lower(trim(p_provider)), trim(p_model), lower(trim(p_prompt_version)),
    lower(trim(p_input_sha256)), (select auth.uid())
  ) returning id into run_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'AIAnalysisRequested', p_source_type, p_source_id, (select auth.uid()),
    jsonb_build_object(
      'run_id', run_id,
      'analysis_kind', p_analysis_kind,
      'provider', lower(trim(p_provider)),
      'model', trim(p_model),
      'prompt_version', lower(trim(p_prompt_version))
    )
  );
  return run_id;
end;
$$;

create or replace function public.start_ai_analysis(p_run_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Trusted AI service access is required' using errcode = '42501';
  end if;
  perform set_config('app.phase10_command', 'yes', true);
  update public.ai_runs
  set status = 'processing', started_at = now()
  where id = p_run_id and status = 'queued';
  if not found then
    perform set_config('app.phase10_command', '', true);
    raise exception 'Queued AI run not found' using errcode = 'P0002';
  end if;
  perform set_config('app.phase10_command', '', true);
end;
$$;

create or replace function public.complete_ai_analysis(
  p_run_id uuid,
  p_provider_request_id text,
  p_payload jsonb,
  p_summary text,
  p_confidence numeric,
  p_evidence jsonb,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  run_record public.ai_runs;
  suggestion_id uuid;
  evidence_record jsonb;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Trusted AI service access is required' using errcode = '42501';
  end if;
  select * into run_record from public.ai_runs
  where id = p_run_id and status = 'processing' for update;
  if not found then raise exception 'Processing AI run not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_evidence) <> 'array' then
    raise exception 'Validated AI payload and evidence are required' using errcode = '22023';
  end if;
  perform set_config('app.phase10_command', 'yes', true);
  update public.ai_suggestions set status = 'superseded', updated_at = now()
  where source_type = run_record.source_type
    and source_id = run_record.source_id
    and analysis_kind = run_record.analysis_kind
    and status = 'pending_review';
  insert into public.ai_suggestions (
    run_id, analysis_kind, source_type, source_id, provider_payload,
    reviewed_payload, summary, confidence
  ) values (
    run_record.id, run_record.analysis_kind, run_record.source_type,
    run_record.source_id, p_payload, p_payload, trim(p_summary), p_confidence
  ) returning id into suggestion_id;
  for evidence_record in select value from jsonb_array_elements(p_evidence)
  loop
    insert into public.ai_suggestion_evidence (
      suggestion_id, field_path, source_type, source_id, excerpt,
      start_offset, end_offset, confidence
    ) values (
      suggestion_id,
      evidence_record->>'field_path',
      evidence_record->>'source_type',
      (evidence_record->>'source_id')::uuid,
      evidence_record->>'excerpt',
      nullif(evidence_record->>'start_offset', '')::integer,
      nullif(evidence_record->>'end_offset', '')::integer,
      (evidence_record->>'confidence')::numeric
    );
  end loop;
  update public.ai_runs set
    status = 'completed',
    provider_request_id = nullif(trim(p_provider_request_id), ''),
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    completed_at = now()
  where id = p_run_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'AISuggestionCreated', run_record.source_type, run_record.source_id,
    run_record.requested_by, jsonb_build_object(
      'run_id', run_record.id,
      'suggestion_id', suggestion_id,
      'analysis_kind', run_record.analysis_kind,
      'confidence', p_confidence
    )
  );
  return suggestion_id;
end;
$$;

create or replace function public.fail_ai_analysis(
  p_run_id uuid,
  p_error_code text,
  p_error_message text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  run_record public.ai_runs;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Trusted AI service access is required' using errcode = '42501';
  end if;
  select * into run_record from public.ai_runs
  where id = p_run_id and status in ('queued', 'processing') for update;
  if not found then raise exception 'Active AI run not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase10_command', 'yes', true);
  update public.ai_runs set
    status = 'failed',
    started_at = coalesce(started_at, now()),
    completed_at = now(),
    error_code = left(trim(p_error_code), 100),
    error_message = left(trim(p_error_message), 1000)
  where id = p_run_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'AIAnalysisFailed', run_record.source_type, run_record.source_id,
    run_record.requested_by, jsonb_build_object(
      'run_id', run_record.id,
      'analysis_kind', run_record.analysis_kind,
      'error_code', left(trim(p_error_code), 100)
    )
  );
end;
$$;

create or replace function public.revise_ai_suggestion(
  p_suggestion_id uuid,
  p_revised_payload jsonb,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.ai_suggestions;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_revised_payload) <> 'object' then
    raise exception 'A structured revised payload is required' using errcode = '22023';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A correction reason is required' using errcode = '22023';
  end if;
  select * into target from public.ai_suggestions
  where id = p_suggestion_id and status = 'pending_review' for update;
  if not found then raise exception 'Pending AI suggestion not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.ai_suggestion_revisions (
    suggestion_id, previous_payload, revised_payload, reason, changed_by
  ) values (
    target.id, target.reviewed_payload, p_revised_payload, trim(p_reason), (select auth.uid())
  );
  update public.ai_suggestions set
    reviewed_payload = p_revised_payload,
    summary = coalesce(nullif(trim(p_revised_payload->>'summary'), ''), summary),
    updated_at = now()
  where id = p_suggestion_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'AISuggestionCorrected', target.source_type, target.source_id, (select auth.uid()),
    jsonb_build_object('suggestion_id', target.id, 'analysis_kind', target.analysis_kind)
  );
end;
$$;

create or replace function public.review_ai_suggestion(
  p_suggestion_id uuid,
  p_approved boolean,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.ai_suggestions;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A review reason is required' using errcode = '22023';
  end if;
  select * into target from public.ai_suggestions
  where id = p_suggestion_id and status = 'pending_review' for update;
  if not found then raise exception 'Pending AI suggestion not found' using errcode = 'P0002'; end if;
  perform set_config('app.phase10_command', 'yes', true);
  update public.ai_suggestions set
    status = case
      when p_approved then 'approved'::public.ai_suggestion_status
      else 'rejected'::public.ai_suggestion_status
    end,
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    review_reason = trim(p_reason),
    updated_at = now()
  where id = p_suggestion_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    case when p_approved then 'AISuggestionApproved' else 'AISuggestionRejected' end,
    target.source_type, target.source_id, (select auth.uid()),
    jsonb_build_object('suggestion_id', target.id, 'analysis_kind', target.analysis_kind)
  );
end;
$$;

create or replace function public.classify_email_message_with_details(
  p_message_id uuid,
  p_classification public.email_classification,
  p_reason text,
  p_enquiry_id uuid default null,
  p_contact_id uuid default null,
  p_enquiry_summary text default null,
  p_requested_yacht_id uuid default null,
  p_charter_start_date date default null,
  p_charter_end_date date default null,
  p_guest_count smallint default null,
  p_embarkation_port text default null,
  p_disembarkation_port text default null,
  p_budget_amount numeric default null,
  p_currency text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  linked_enquiry_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if (p_charter_start_date is null) <> (p_charter_end_date is null)
    or (
      p_charter_start_date is not null
      and p_charter_end_date < p_charter_start_date
    )
  then
    raise exception 'Reviewed charter dates must be valid and supplied together'
      using errcode = '22023';
  end if;
  if (p_budget_amount is null) <> (nullif(trim(p_currency), '') is null)
    or p_budget_amount < 0
    or (
      p_currency is not null
      and upper(trim(p_currency)) !~ '^[A-Z]{3}$'
    )
  then
    raise exception 'Reviewed budget and currency must be valid and supplied together'
      using errcode = '22023';
  end if;
  if p_requested_yacht_id is not null and not exists (
    select 1 from public.yachts where id = p_requested_yacht_id and status = 'active'
  ) then
    raise exception 'Reviewed requested yacht must be active' using errcode = '23514';
  end if;
  linked_enquiry_id := public.classify_email_message(
    p_message_id,
    p_classification,
    p_reason,
    p_enquiry_id,
    p_contact_id,
    p_enquiry_summary
  );
  if p_classification = 'new_enquiry' and linked_enquiry_id is not null then
    update public.enquiries set
      requested_yacht_id = p_requested_yacht_id,
      charter_start_date = p_charter_start_date,
      charter_end_date = p_charter_end_date,
      guest_count = p_guest_count,
      embarkation_port = nullif(trim(p_embarkation_port), ''),
      disembarkation_port = nullif(trim(p_disembarkation_port), ''),
      budget_amount = p_budget_amount,
      currency = nullif(upper(trim(p_currency)), ''),
      updated_by = (select auth.uid()),
      updated_at = now()
    where id = linked_enquiry_id;
    insert into public.workflow_events (
      event_type, aggregate_type, aggregate_id, actor_user_id, payload
    ) values (
      'ReviewedEmailEnquiryDetailsApplied', 'enquiry', linked_enquiry_id,
      (select auth.uid()), jsonb_build_object(
        'source_message_id', p_message_id,
        'requested_yacht_id', p_requested_yacht_id,
        'charter_start_date', p_charter_start_date,
        'charter_end_date', p_charter_end_date,
        'guest_count', p_guest_count,
        'has_budget', p_budget_amount is not null
      )
    );
  end if;
  return linked_enquiry_id;
end;
$$;

create policy "active staff read communication templates"
  on public.communication_templates for select to authenticated
  using ((select public.is_active_staff()));
create policy "active staff read AI runs"
  on public.ai_runs for select to authenticated
  using ((select public.is_active_staff()));
create policy "active staff read AI suggestions"
  on public.ai_suggestions for select to authenticated
  using ((select public.is_active_staff()));
create policy "active staff read AI evidence"
  on public.ai_suggestion_evidence for select to authenticated
  using ((select public.is_active_staff()));
create policy "active staff read AI revisions"
  on public.ai_suggestion_revisions for select to authenticated
  using ((select public.is_active_staff()));

revoke all on public.communication_templates, public.ai_runs, public.ai_suggestions,
  public.ai_suggestion_evidence, public.ai_suggestion_revisions from public, anon, authenticated;
grant select on public.communication_templates, public.ai_runs, public.ai_suggestions,
  public.ai_suggestion_evidence, public.ai_suggestion_revisions to authenticated;
grant select on public.ai_runs, public.ai_suggestions, public.ai_suggestion_evidence
  to service_role;

revoke all on function public.guard_phase10_direct_mutation() from public, anon, authenticated;
revoke all on function public.validate_communication_template_placeholders(
  public.communication_template_kind,text,text
) from public, anon;
revoke all on function public.create_communication_template_draft(
  public.communication_template_kind,text,text,text
) from public, anon;
revoke all on function public.clone_communication_template(uuid,text) from public, anon;
revoke all on function public.update_communication_template_draft(uuid,text,text,text)
  from public, anon;
revoke all on function public.approve_communication_template(uuid) from public, anon;
revoke all on function public.request_ai_analysis(
  text,public.ai_analysis_kind,text,uuid,text,text,text,text
) from public, anon;
revoke all on function public.start_ai_analysis(uuid) from public, anon, authenticated;
revoke all on function public.complete_ai_analysis(
  uuid,text,jsonb,text,numeric,jsonb,integer,integer
) from public, anon, authenticated;
revoke all on function public.fail_ai_analysis(uuid,text,text) from public, anon, authenticated;
revoke all on function public.revise_ai_suggestion(uuid,jsonb,text) from public, anon;
revoke all on function public.review_ai_suggestion(uuid,boolean,text) from public, anon;
revoke all on function public.classify_email_message_with_details(
  uuid,public.email_classification,text,uuid,uuid,text,uuid,date,date,smallint,text,text,numeric,text
) from public, anon;

grant execute on function public.validate_communication_template_placeholders(
  public.communication_template_kind,text,text
) to authenticated;
grant execute on function public.create_communication_template_draft(
  public.communication_template_kind,text,text,text
) to authenticated;
grant execute on function public.clone_communication_template(uuid,text) to authenticated;
grant execute on function public.update_communication_template_draft(uuid,text,text,text)
  to authenticated;
grant execute on function public.approve_communication_template(uuid) to authenticated;
grant execute on function public.request_ai_analysis(
  text,public.ai_analysis_kind,text,uuid,text,text,text,text
) to authenticated;
grant execute on function public.start_ai_analysis(uuid) to service_role;
grant execute on function public.complete_ai_analysis(
  uuid,text,jsonb,text,numeric,jsonb,integer,integer
) to service_role;
grant execute on function public.fail_ai_analysis(uuid,text,text) to service_role;
grant execute on function public.revise_ai_suggestion(uuid,jsonb,text) to authenticated;
grant execute on function public.review_ai_suggestion(uuid,boolean,text) to authenticated;
grant execute on function public.classify_email_message_with_details(
  uuid,public.email_classification,text,uuid,uuid,text,uuid,date,date,smallint,text,text,numeric,text
) to authenticated;
