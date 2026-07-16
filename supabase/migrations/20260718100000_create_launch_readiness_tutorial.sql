-- Phase 12: launch-readiness controls, backup evidence, and isolated tutorial state.

create type public.tutorial_status as enum (
  'not_started',
  'active',
  'paused',
  'completed'
);

create type public.tutorial_practice_stage as enum (
  'email_received',
  'classified',
  'enquiry_created',
  'offer_prepared',
  'contract_reviewed',
  'booking_confirmed',
  'compliance_completed',
  'operations_ready',
  'charter_active',
  'charter_completed',
  'follow_up_completed'
);

create type public.launch_check_status as enum ('pending', 'passed', 'waived');
create type public.backup_verification_status as enum ('started', 'passed', 'failed');

create table public.tutorial_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.tutorial_status not null default 'not_started',
  current_step integer not null default 0 check (current_step between 0 and 11),
  practice_stage public.tutorial_practice_stage not null default 'email_received',
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  reset_count integer not null default 0 check (reset_count between 0 and 10000),
  updated_at timestamptz not null default now(),
  constraint tutorial_session_timestamps check (
    (status = 'not_started' and started_at is null and paused_at is null and completed_at is null)
    or (status = 'active' and started_at is not null and paused_at is null and completed_at is null)
    or (status = 'paused' and started_at is not null and paused_at is not null and completed_at is null)
    or (status = 'completed' and started_at is not null and completed_at is not null)
  )
);

create table public.tutorial_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{1,79}$'),
  step integer not null check (step between 0 and 11),
  practice_stage public.tutorial_practice_stage not null,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object' and octet_length(details::text) <= 10000
  ),
  created_at timestamptz not null default now()
);

create index tutorial_history_user_time_idx
  on public.tutorial_history (user_id, created_at desc);

create table public.launch_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null unique check (check_key ~ '^[a-z][a-z0-9_]{2,79}$'),
  category text not null check (
    category in (
      'access',
      'deployment',
      'integrations',
      'backup',
      'monitoring',
      'privacy',
      'acceptance'
    )
  ),
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null check (char_length(trim(description)) between 3 and 2000),
  required boolean not null default true,
  status public.launch_check_status not null default 'pending',
  evidence text check (
    evidence is null or char_length(trim(evidence)) between 2 and 4000
  ),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint launch_check_review_fields check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

insert into public.launch_readiness_checks (
  check_key, category, title, description
) values
  (
    'individual_accounts',
    'access',
    'Individual production accounts approved',
    'Every staff member has an individual account, the administrator and recovery owner are named, and shared credentials are prohibited.'
  ),
  (
    'mfa_and_recovery',
    'access',
    'MFA and account recovery accepted',
    'The production MFA decision, password recovery route, SMTP ownership, and emergency administrator recovery procedure have been tested.'
  ),
  (
    'production_supabase',
    'deployment',
    'Production Supabase project commissioned',
    'A paid production project is owned by Torrance Yachts, region and spend controls are accepted, migrations are applied, and no development data is present.'
  ),
  (
    'production_application',
    'deployment',
    'Hosted application deployed',
    'The versioned application image runs behind HTTPS on the approved domain with production-only secrets and a documented rollback procedure.'
  ),
  (
    'domain_and_tls',
    'deployment',
    'Domain, DNS, and TLS verified',
    'The production domain is owned by the client, HTTPS is enforced, certificate renewal is automatic, and HTTP redirects to HTTPS.'
  ),
  (
    'gmail_connection',
    'integrations',
    'Gmail mailbox and scopes accepted',
    'The operational mailbox owner, forwarding route, OAuth scopes, draft-only policy, duplicate handling, and failure recovery have been accepted.'
  ),
  (
    'telegram_connection',
    'integrations',
    'Telegram bot and recipients accepted',
    'Bot ownership, internal chat identifiers, approval wording, recipient mapping, and lost-token recovery have been verified.'
  ),
  (
    'google_workspace_connections',
    'integrations',
    'Calendar, Drive, and Sheets targets accepted',
    'The calendar, protected Drive folder, one-way workbook, account ownership, and minimum OAuth scopes have been verified.'
  ),
  (
    'n8n_production',
    'integrations',
    'n8n production worker secured',
    'The worker uses encrypted credentials, a protected editor, version-controlled workflows, backups, health monitoring, and a completed security audit.'
  ),
  (
    'database_backup',
    'backup',
    'Database backup active',
    'Managed daily backups or an approved automated logical export run on schedule and an off-site copy is retained under the approved policy.'
  ),
  (
    'storage_backup',
    'backup',
    'Private document backup active',
    'Private storage objects and metadata are backed up or versioned outside the primary failure domain without creating public links.'
  ),
  (
    'restore_drill',
    'backup',
    'Restore drill passed',
    'A recent database and document restore was completed into an isolated environment and the critical enquiry-to-booking records were verified.'
  ),
  (
    'health_monitoring',
    'monitoring',
    'Health and failure monitoring active',
    'Application readiness, automation failures, notification failures, backup age, and expiring credentials alert an owned internal recipient.'
  ),
  (
    'incident_ownership',
    'monitoring',
    'Incident ownership and escalation accepted',
    'A named owner can disable integrations, rotate credentials, restore service, notify affected staff, and record the incident.'
  ),
  (
    'retention_policy',
    'privacy',
    'Retention and deletion policy approved',
    'Retention periods and disposal procedures for enquiries, contracts, identity documents, KYC/CDD, invoices, email, and audit records are approved.'
  ),
  (
    'document_security',
    'privacy',
    'Document security controls accepted',
    'Upload limits, private storage, verification, safe filenames, quarantine or malware-scanning procedure, and access review are accepted.'
  ),
  (
    'privacy_review',
    'privacy',
    'Privacy and data-processing review complete',
    'The client has accepted controller/processor ownership, provider regions and agreements, AI submission rules, and breach-response responsibilities.'
  ),
  (
    'macos_acceptance',
    'acceptance',
    'macOS browser acceptance passed',
    'The primary employee completed the critical workflow in the supported macOS browser using synthetic data without developer assistance.'
  ),
  (
    'staff_training',
    'acceptance',
    'Staff training and tutorial accepted',
    'The client completed the guided tutorial and resettable practice scenario and knows which actions are manual, integrated, or AI-assisted.'
  ),
  (
    'launch_signoff',
    'acceptance',
    'Client launch sign-off recorded',
    'The client accepts the production scope, known limitations, support owner, operating costs, and go-live date.'
  );

create table public.backup_verifications (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('database', 'storage', 'full')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  status public.backup_verification_status not null,
  artifact_reference text check (
    artifact_reference is null
    or char_length(trim(artifact_reference)) between 2 and 500
  ),
  checksum_sha256 text check (
    checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  started_at timestamptz not null,
  completed_at timestamptz,
  restore_tested_at timestamptz,
  notes text not null check (char_length(trim(notes)) between 2 and 4000),
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint backup_verification_completion check (
    (status = 'started' and completed_at is null)
    or (status in ('passed', 'failed') and completed_at is not null)
  ),
  constraint successful_backup_evidence check (
    status <> 'passed'
    or checksum_sha256 is not null and restore_tested_at is not null
  )
);

create index backup_verifications_environment_time_idx
  on public.backup_verifications (environment, created_at desc);

create or replace function public.guard_phase12_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.phase12_command', true), '') <> 'yes' then
    raise exception 'Use an approved Phase 12 command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_tutorial_sessions
  before insert or update or delete on public.tutorial_sessions
  for each row execute function public.guard_phase12_direct_mutation();
create trigger guard_tutorial_history
  before insert or update or delete on public.tutorial_history
  for each row execute function public.guard_phase12_direct_mutation();
create trigger guard_launch_readiness_checks
  before insert or update or delete on public.launch_readiness_checks
  for each row execute function public.guard_phase12_direct_mutation();
create trigger guard_backup_verifications
  before insert or update or delete on public.backup_verifications
  for each row execute function public.guard_phase12_direct_mutation();

create or replace function public.record_tutorial_event(
  p_user_id uuid,
  p_event_type text,
  p_step integer,
  p_stage public.tutorial_practice_stage,
  p_details jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.phase12_command', 'yes', true);
  insert into public.tutorial_history (
    user_id, event_type, step, practice_stage, details
  ) values (
    p_user_id, p_event_type, p_step, p_stage, coalesce(p_details, '{}'::jsonb)
  );
  perform set_config('app.phase12_command', '', true);
end;
$$;

create or replace function public.start_tutorial()
returns public.tutorial_sessions
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  current_session public.tutorial_sessions;
  session_found boolean;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  select * into current_session
  from public.tutorial_sessions where user_id = actor_id for update;
  session_found := found;

  perform set_config('app.phase12_command', 'yes', true);
  if not session_found then
    insert into public.tutorial_sessions (
      user_id, status, current_step, practice_stage, started_at
    ) values (
      actor_id, 'active', 0, 'email_received', now()
    ) returning * into current_session;
  elsif current_session.status in ('not_started', 'paused') then
    update public.tutorial_sessions
    set status = 'active',
        started_at = coalesce(started_at, now()),
        paused_at = null,
        updated_at = now()
    where user_id = actor_id
    returning * into current_session;
  end if;
  perform set_config('app.phase12_command', '', true);

  perform public.record_tutorial_event(
    actor_id, 'tutorial_started', current_session.current_step,
    current_session.practice_stage
  );
  return current_session;
end;
$$;

create or replace function public.pause_tutorial()
returns public.tutorial_sessions
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  current_session public.tutorial_sessions;
  session_updated boolean;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  perform set_config('app.phase12_command', 'yes', true);
  update public.tutorial_sessions
  set status = 'paused', paused_at = now(), updated_at = now()
  where user_id = actor_id and status = 'active'
  returning * into current_session;
  session_updated := found;
  perform set_config('app.phase12_command', '', true);

  if not session_updated then
    raise exception 'Active tutorial session not found' using errcode = 'P0002';
  end if;
  perform public.record_tutorial_event(
    actor_id, 'tutorial_paused', current_session.current_step,
    current_session.practice_stage
  );
  return current_session;
end;
$$;

create or replace function public.advance_tutorial(
  p_step integer,
  p_stage public.tutorial_practice_stage,
  p_event_type text
)
returns public.tutorial_sessions
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  current_session public.tutorial_sessions;
  next_status public.tutorial_status;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_step not between 0 and 11 then
    raise exception 'Tutorial step is outside the supported range' using errcode = '22023';
  end if;
  if p_event_type !~ '^[a-z][a-z0-9_]{1,79}$' then
    raise exception 'Tutorial event type is invalid' using errcode = '22023';
  end if;

  select * into current_session
  from public.tutorial_sessions
  where user_id = actor_id and status = 'active'
  for update;
  if not found then
    raise exception 'Active tutorial session not found' using errcode = 'P0002';
  end if;
  if p_step < current_session.current_step
     or p_step > current_session.current_step + 1 then
    raise exception 'Tutorial steps must be completed in order' using errcode = '23514';
  end if;
  if p_stage < current_session.practice_stage then
    raise exception 'Practice workflow cannot move backwards' using errcode = '23514';
  end if;

  next_status := case when p_step = 11
    and p_stage = 'follow_up_completed'
    and p_event_type = 'tutorial_completed'
    then 'completed'::public.tutorial_status
    else 'active'::public.tutorial_status end;

  perform set_config('app.phase12_command', 'yes', true);
  update public.tutorial_sessions
  set current_step = greatest(current_step, p_step),
      practice_stage = p_stage,
      status = next_status,
      completed_at = case when next_status = 'completed' then now() else null end,
      updated_at = now()
  where user_id = actor_id
  returning * into current_session;
  perform set_config('app.phase12_command', '', true);

  perform public.record_tutorial_event(
    actor_id, p_event_type, current_session.current_step,
    current_session.practice_stage
  );
  return current_session;
end;
$$;

create or replace function public.reset_tutorial(p_reason text)
returns public.tutorial_sessions
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  current_session public.tutorial_sessions;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 2 then
    raise exception 'A reset reason is required' using errcode = '22023';
  end if;

  perform set_config('app.phase12_command', 'yes', true);
  insert into public.tutorial_sessions (
    user_id, status, current_step, practice_stage, reset_count
  ) values (
    actor_id, 'not_started', 0, 'email_received', 1
  )
  on conflict (user_id) do update
  set status = 'not_started',
      current_step = 0,
      practice_stage = 'email_received',
      started_at = null,
      paused_at = null,
      completed_at = null,
      reset_count = public.tutorial_sessions.reset_count + 1,
      updated_at = now()
  returning * into current_session;
  perform set_config('app.phase12_command', '', true);

  perform public.record_tutorial_event(
    actor_id, 'tutorial_reset', 0, 'email_received',
    jsonb_build_object('reason', trim(p_reason))
  );
  return current_session;
end;
$$;

create or replace function public.update_launch_readiness_check(
  p_check_key text,
  p_status public.launch_check_status,
  p_evidence text,
  p_reason text
)
returns public.launch_readiness_checks
language plpgsql security definer set search_path = '' as $$
declare
  current_check public.launch_readiness_checks;
  updated_check public.launch_readiness_checks;
  clean_evidence text := nullif(trim(p_evidence), '');
  clean_reason text := trim(p_reason);
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(clean_reason) < 2 then
    raise exception 'A review reason is required' using errcode = '22023';
  end if;
  if p_status <> 'pending' and clean_evidence is null then
    raise exception 'Passed or waived checks require evidence' using errcode = '23514';
  end if;

  select * into current_check
  from public.launch_readiness_checks
  where check_key = p_check_key for update;
  if not found then
    raise exception 'Launch readiness check not found' using errcode = 'P0002';
  end if;

  perform set_config('app.phase12_command', 'yes', true);
  update public.launch_readiness_checks
  set status = p_status,
      evidence = case when p_status = 'pending' then null else clean_evidence end,
      reviewed_by = case when p_status = 'pending' then null else (select auth.uid()) end,
      reviewed_at = case when p_status = 'pending' then null else now() end,
      updated_at = now()
  where id = current_check.id
  returning * into updated_check;
  perform set_config('app.phase12_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'LaunchReadinessReviewed', 'launch_readiness_check', current_check.id,
    (select auth.uid()), jsonb_build_object(
      'check_key', current_check.check_key,
      'from_status', current_check.status,
      'to_status', p_status,
      'reason', clean_reason
    )
  );
  return updated_check;
end;
$$;

create or replace function public.record_backup_verification(
  p_scope text,
  p_environment text,
  p_status public.backup_verification_status,
  p_artifact_reference text,
  p_checksum_sha256 text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_restore_tested_at timestamptz,
  p_notes text
)
returns public.backup_verifications
language plpgsql security definer set search_path = '' as $$
declare created_record public.backup_verifications;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_scope not in ('database', 'storage', 'full')
     or p_environment not in ('development', 'staging', 'production') then
    raise exception 'Backup scope or environment is invalid' using errcode = '22023';
  end if;
  if char_length(trim(p_notes)) < 2 then
    raise exception 'Backup verification notes are required' using errcode = '22023';
  end if;

  perform set_config('app.phase12_command', 'yes', true);
  insert into public.backup_verifications (
    scope, environment, status, artifact_reference, checksum_sha256,
    started_at, completed_at, restore_tested_at, notes, recorded_by
  ) values (
    p_scope, p_environment, p_status, nullif(trim(p_artifact_reference), ''),
    nullif(lower(trim(p_checksum_sha256)), ''), p_started_at, p_completed_at,
    p_restore_tested_at, trim(p_notes), (select auth.uid())
  ) returning * into created_record;
  perform set_config('app.phase12_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'BackupVerificationRecorded', 'backup_verification', created_record.id,
    (select auth.uid()), jsonb_build_object(
      'scope', p_scope,
      'environment', p_environment,
      'status', p_status
    )
  );
  return created_record;
end;
$$;

create or replace function public.get_launch_readiness_summary()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  required_total integer;
  required_passed integer;
  required_waived integer;
  required_pending integer;
  latest_restore timestamptz;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;

  select
    count(*) filter (where required),
    count(*) filter (where required and status = 'passed'),
    count(*) filter (where required and status = 'waived'),
    count(*) filter (where required and status = 'pending')
  into required_total, required_passed, required_waived, required_pending
  from public.launch_readiness_checks;

  select max(restore_tested_at) into latest_restore
  from public.backup_verifications
  where status = 'passed';

  return jsonb_build_object(
    'required_total', required_total,
    'required_passed', required_passed,
    'required_waived', required_waived,
    'required_pending', required_pending,
    'latest_restore_tested_at', latest_restore,
    'production_approved', required_pending = 0 and required_waived = 0
  );
end;
$$;

create or replace function public.get_operational_readiness(p_environment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  active_users integer;
  failed_deliveries integer;
  latest_restore timestamptz;
begin
  if p_environment not in ('development', 'staging', 'production') then
    raise exception 'Readiness environment is invalid' using errcode = '22023';
  end if;

  select count(*) into active_users
  from public.profiles
  where active;

  select count(*) into failed_deliveries
  from public.integration_deliveries
  where status = 'failed';

  select max(restore_tested_at) into latest_restore
  from public.backup_verifications
  where environment = p_environment and status = 'passed';

  return jsonb_build_object(
    'active_users', active_users,
    'failed_deliveries', failed_deliveries,
    'latest_restore_tested_at', latest_restore
  );
end;
$$;

alter table public.tutorial_sessions enable row level security;
alter table public.tutorial_history enable row level security;
alter table public.launch_readiness_checks enable row level security;
alter table public.backup_verifications enable row level security;

create policy "users read own tutorial session" on public.tutorial_sessions
  for select to authenticated using (
    (select public.is_active_staff()) and user_id = (select auth.uid())
  );
create policy "users read own tutorial history" on public.tutorial_history
  for select to authenticated using (
    (select public.is_active_staff()) and user_id = (select auth.uid())
  );
create policy "active staff read launch checks" on public.launch_readiness_checks
  for select to authenticated using ((select public.is_active_staff()));
create policy "administrators read backup evidence" on public.backup_verifications
  for select to authenticated using ((select public.is_administrator()));

revoke all on public.tutorial_sessions, public.tutorial_history,
  public.launch_readiness_checks, public.backup_verifications
  from public, anon;
grant select on public.tutorial_sessions, public.tutorial_history,
  public.launch_readiness_checks to authenticated;
grant select on public.backup_verifications to authenticated;
grant select on public.tutorial_sessions, public.tutorial_history,
  public.launch_readiness_checks, public.backup_verifications to service_role;

revoke all on function public.record_tutorial_event(
  uuid,text,integer,public.tutorial_practice_stage,jsonb
) from public, anon, authenticated;
revoke all on function public.start_tutorial() from public, anon;
revoke all on function public.pause_tutorial() from public, anon;
revoke all on function public.advance_tutorial(
  integer,public.tutorial_practice_stage,text
) from public, anon;
revoke all on function public.reset_tutorial(text) from public, anon;
revoke all on function public.update_launch_readiness_check(
  text,public.launch_check_status,text,text
) from public, anon;
revoke all on function public.record_backup_verification(
  text,text,public.backup_verification_status,text,text,
  timestamptz,timestamptz,timestamptz,text
) from public, anon;
revoke all on function public.get_launch_readiness_summary() from public, anon;
revoke all on function public.get_operational_readiness(text)
  from public, anon, authenticated;

grant execute on function public.start_tutorial() to authenticated;
grant execute on function public.pause_tutorial() to authenticated;
grant execute on function public.advance_tutorial(
  integer,public.tutorial_practice_stage,text
) to authenticated;
grant execute on function public.reset_tutorial(text) to authenticated;
grant execute on function public.update_launch_readiness_check(
  text,public.launch_check_status,text,text
) to authenticated;
grant execute on function public.record_backup_verification(
  text,text,public.backup_verification_status,text,text,
  timestamptz,timestamptz,timestamptz,text
) to authenticated;
grant execute on function public.get_launch_readiness_summary() to authenticated;
grant execute on function public.get_operational_readiness(text) to service_role;

create or replace function public.update_internal_user(
  p_user_id uuid,
  p_display_name text,
  p_phone text,
  p_telegram_chat_id text,
  p_role public.user_role,
  p_active boolean,
  p_reason text
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  current_profile public.profiles;
  updated_profile public.profiles;
  other_administrators integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_display_name)) not between 2 and 100
     or char_length(trim(p_reason)) < 2 then
    raise exception 'Display name and review reason are required' using errcode = '22023';
  end if;

  select * into current_profile
  from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Internal user not found' using errcode = 'P0002';
  end if;
  if p_user_id = (select auth.uid())
     and (not p_active or p_role <> 'administrator') then
    raise exception 'Administrators cannot remove their own recovery access'
      using errcode = '23514';
  end if;

  if current_profile.active and current_profile.role = 'administrator'
     and (not p_active or p_role <> 'administrator') then
    select count(*) into other_administrators
    from public.profiles
    where active and role = 'administrator' and id <> p_user_id;
    if other_administrators = 0 then
      raise exception 'At least one active administrator is required'
        using errcode = '23514';
    end if;
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      phone = nullif(trim(p_phone), ''),
      telegram_chat_id = nullif(trim(p_telegram_chat_id), ''),
      role = p_role,
      active = p_active
  where id = p_user_id
  returning * into updated_profile;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, old_values, new_values, source
  ) values (
    (select auth.uid()), 'update', 'profile', p_user_id,
    to_jsonb(current_profile), to_jsonb(updated_profile), 'user_administration'
  );
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InternalUserUpdated', 'profile', p_user_id, (select auth.uid()),
    jsonb_build_object(
      'reason', trim(p_reason),
      'role', p_role,
      'active', p_active
    )
  );
  return updated_profile;
end;
$$;

revoke all on function public.update_internal_user(
  uuid,text,text,text,public.user_role,boolean,text
) from public, anon;
grant execute on function public.update_internal_user(
  uuid,text,text,text,public.user_role,boolean,text
) to authenticated;
