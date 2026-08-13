begin;
create extension if not exists pgtap with schema extensions;
select plan(78);

select has_table('public', 'tutorial_sessions', 'tutorial sessions table exists');
select has_table('public', 'tutorial_history', 'tutorial history table exists');
select has_table('public', 'launch_readiness_checks', 'launch checklist exists');
select has_table('public', 'backup_verifications', 'backup evidence table exists');
select has_function(
  'public', 'get_operational_readiness', array['text'],
  'service-only operational readiness function exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tutorial_sessions'::regclass),
  'tutorial sessions have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tutorial_history'::regclass),
  'tutorial history has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.launch_readiness_checks'::regclass),
  'launch checklist has RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.backup_verifications'::regclass),
  'backup evidence has RLS'
);
select results_eq(
  $$ select count(*) from public.launch_readiness_checks $$,
  array[20::bigint],
  'twenty launch acceptance checks are seeded'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'launch.admin@example.test',
    '{"display_name":"Launch Administrator"}'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'launch.staff@example.test',
    '{"display_name":"Launch Staff"}'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'launch.other@example.test',
    '{"display_name":"Other Launch Staff"}'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'launch.inactive@example.test',
    '{"display_name":"Inactive Launch Staff"}'
  );
update public.profiles
set role = 'administrator'
where id = '20000000-0000-4000-8000-000000000001';
update public.profiles
set active = false
where id = '20000000-0000-4000-8000-000000000004';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000000';
select throws_ok(
  $$ select count(*) from public.tutorial_sessions $$,
  '42501', 'permission denied for table tutorial_sessions',
  'anonymous users cannot read tutorial sessions'
);
select throws_ok(
  $$ select count(*) from public.tutorial_history $$,
  '42501', 'permission denied for table tutorial_history',
  'anonymous users cannot read tutorial history'
);
select throws_ok(
  $$ select count(*) from public.launch_readiness_checks $$,
  '42501', 'permission denied for table launch_readiness_checks',
  'anonymous users cannot read launch checks'
);
select throws_ok(
  $$ select count(*) from public.backup_verifications $$,
  '42501', 'permission denied for table backup_verifications',
  'anonymous users cannot read backup evidence'
);
select throws_ok(
  $$ select public.get_operational_readiness('development') $$,
  '42501', 'permission denied for function get_operational_readiness',
  'anonymous users cannot query operational readiness'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';
select lives_ok(
  $$ select public.start_tutorial() $$,
  'active staff can start the tutorial'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['active'],
  'tutorial starts active'
);
select results_eq(
  $$ select count(*) from public.tutorial_sessions $$,
  array[1::bigint],
  'staff can read only the current tutorial session'
);
select results_eq(
  $$ select count(*) from public.tutorial_history
     where event_type = 'tutorial_started' $$,
  array[1::bigint],
  'tutorial start is recorded'
);
select throws_ok(
  $$ update public.tutorial_sessions set current_step = 11 $$,
  '42501', 'permission denied for table tutorial_sessions',
  'staff cannot mutate tutorial state directly'
);
select throws_ok(
  $$ update public.launch_readiness_checks set status = 'passed' $$,
  '42501', 'permission denied for table launch_readiness_checks',
  'staff cannot mutate launch checks directly'
);
select throws_ok(
  $$ insert into public.backup_verifications (
       scope, environment, status, started_at, notes, recorded_by
     ) values (
       'database', 'development', 'started', now(), 'Direct insert',
       '20000000-0000-4000-8000-000000000002'
     ) $$,
  '42501', 'permission denied for table backup_verifications',
  'staff cannot insert backup evidence directly'
);
select lives_ok(
  $$ select public.advance_tutorial(1, 'classified', 'email_classified') $$,
  'staff can advance to the classification step'
);
select results_eq(
  $$ select current_step from public.tutorial_sessions $$,
  array[1],
  'tutorial step advances'
);
select results_eq(
  $$ select practice_stage::text from public.tutorial_sessions $$,
  array['classified'],
  'practice scenario advances'
);
select throws_ok(
  $$ select public.advance_tutorial(3, 'offer_prepared', 'offer_prepared') $$,
  '23514', 'Tutorial steps must be completed in order',
  'tutorial steps cannot be skipped'
);
select throws_ok(
  $$ select public.advance_tutorial(2, 'email_received', 'workflow_reversed') $$,
  '23514', 'Practice workflow cannot move backwards',
  'practice workflow cannot regress'
);
select lives_ok(
  $$ select public.pause_tutorial() $$,
  'active tutorial can be paused'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['paused'],
  'paused status is retained'
);
select throws_ok(
  $$ select public.advance_tutorial(2, 'enquiry_created', 'enquiry_created') $$,
  'P0002', 'Active tutorial session not found',
  'paused tutorial cannot advance'
);
select lives_ok(
  $$ select public.start_tutorial() $$,
  'paused tutorial can resume'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['active'],
  'resumed tutorial is active'
);
select lives_ok(
  $$ select public.advance_tutorial(2, 'enquiry_created', 'enquiry_created') $$,
  'enquiry practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(3, 'offer_prepared', 'offer_prepared') $$,
  'offer practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(4, 'contract_reviewed', 'contract_reviewed') $$,
  'contract practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(5, 'booking_confirmed', 'booking_confirmed') $$,
  'booking practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(6, 'compliance_completed', 'compliance_completed') $$,
  'compliance practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(7, 'operations_ready', 'operations_ready') $$,
  'operations practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(8, 'charter_active', 'charter_started') $$,
  'charter-start practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(9, 'charter_completed', 'charter_completed') $$,
  'charter-completion practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(10, 'follow_up_completed', 'follow_up_completed') $$,
  'follow-up practice step advances'
);
select lives_ok(
  $$ select public.advance_tutorial(11, 'follow_up_completed', 'launch_controls_reviewed') $$,
  'staff can enter the final launch-controls step'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['active'],
  'the final tutorial explanation remains visible before completion'
);
select lives_ok(
  $$ select public.advance_tutorial(11, 'follow_up_completed', 'tutorial_completed') $$,
  'staff can explicitly complete the final tutorial step'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['completed'],
  'tutorial becomes completed'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where source_type = 'tutorial' $$,
  array[0::bigint],
  'tutorial creates no provider deliveries'
);
select results_eq(
  $$ select count(*) from public.notifications
     where source_type = 'tutorial' $$,
  array[0::bigint],
  'tutorial creates no operational notifications'
);
select lives_ok(
  $$ select public.reset_tutorial('Repeat the synthetic practice scenario') $$,
  'tutorial can be reset safely'
);
select results_eq(
  $$ select status::text from public.tutorial_sessions $$,
  array['not_started'],
  'reset returns tutorial to not started'
);
select results_eq(
  $$ select reset_count from public.tutorial_sessions $$,
  array[1],
  'reset count is retained'
);
select results_eq(
  $$ select count(*) from public.tutorial_history where event_type = 'tutorial_reset' $$,
  array[1::bigint],
  'reset is retained in history'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000003';
select lives_ok(
  $$ select public.start_tutorial() $$,
  'another staff member can start an isolated tutorial'
);
select results_eq(
  $$ select count(*) from public.tutorial_sessions $$,
  array[1::bigint],
  'other staff member sees only their own session'
);
select results_eq(
  $$ select count(*) from public.tutorial_history
     where user_id = '20000000-0000-4000-8000-000000000002' $$,
  array[0::bigint],
  'other staff member cannot read another tutorial history'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000004';
select throws_ok(
  $$ select public.start_tutorial() $$,
  '42501', 'An active internal account is required',
  'inactive users cannot start tutorials'
);
select results_eq(
  $$ select count(*) from public.tutorial_sessions $$,
  array[0::bigint],
  'inactive users cannot read tutorial state'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select (public.get_launch_readiness_summary()->>'required_pending')::integer $$,
  array[20],
  'all launch checks begin pending'
);
select is(
  (public.get_launch_readiness_summary()->>'production_approved')::boolean,
  false,
  'production is not approved by default'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';
select throws_ok(
  $$ select public.update_launch_readiness_check(
       'individual_accounts', 'passed', 'Synthetic account review',
       'Attempted by normal staff'
     ) $$,
  '42501', 'Administrator access is required',
  'staff cannot approve launch checks'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.update_launch_readiness_check(
       'individual_accounts', 'passed',
       'Synthetic individual-account acceptance evidence',
       'Administrator reviewed the synthetic access checklist'
     ) $$,
  'administrator can pass a launch check'
);
select results_eq(
  $$ select status::text from public.launch_readiness_checks
     where check_key = 'individual_accounts' $$,
  array['passed'],
  'passed launch status is stored'
);
select results_eq(
  $$ select count(*) from public.workflow_events
     where event_type = 'LaunchReadinessReviewed' $$,
  array[1::bigint],
  'launch review creates a workflow event'
);
select lives_ok(
  $$ select public.update_launch_readiness_check(
       'mfa_and_recovery', 'waived',
       'Synthetic time-limited waiver approved by client',
       'Waiver recorded for test only'
     ) $$,
  'administrator can record an evidenced waiver'
);
select results_eq(
  $$ select (public.get_launch_readiness_summary()->>'required_waived')::integer $$,
  array[1],
  'launch summary reports the waiver'
);
select results_eq(
  $$ select (public.get_launch_readiness_summary()->>'required_pending')::integer $$,
  array[18],
  'launch summary reports remaining pending checks'
);
select lives_ok(
  $$ select public.record_backup_verification(
       'database', 'development', 'failed', 'synthetic-failed-backup',
       '', now() - interval '10 minutes', now(), null,
       'Synthetic failure retained for operational visibility'
     ) $$,
  'administrator can record failed backup evidence'
);
select throws_ok(
  $$ select public.record_backup_verification(
       'full', 'development', 'passed', 'synthetic-invalid-backup',
       '', now() - interval '10 minutes', now(), now(),
       'Missing checksum should be rejected'
     ) $$,
  '23514', 'new row for relation "backup_verifications" violates check constraint "successful_backup_evidence"',
  'successful backup evidence requires a checksum'
);
select lives_ok(
  $$ select public.record_backup_verification(
       'full', 'development', 'passed', 'synthetic-restore-drill',
       repeat('a', 64), now() - interval '10 minutes', now(), now(),
       'Synthetic database and storage restore drill passed'
     ) $$,
  'administrator can record a successful restore drill'
);
select results_eq(
  $$ select count(*) from public.backup_verifications
     where artifact_reference like 'synthetic-%' $$,
  array[2::bigint],
  'failed and successful synthetic backup evidence are retained'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';
select throws_ok(
  $$ select public.get_operational_readiness('development') $$,
  '42501', 'permission denied for function get_operational_readiness',
  'normal authenticated users cannot query service readiness'
);
select results_eq(
  $$ select count(*) from public.backup_verifications $$,
  array[0::bigint],
  'normal staff cannot read backup artifact evidence'
);
select throws_ok(
  $$ select public.update_internal_user(
       '20000000-0000-4000-8000-000000000003',
       'Other Launch Staff', '', '', 'staff', true,
       'Normal staff attempted account administration'
     ) $$,
  '42501', 'Administrator access is required',
  'staff cannot administer internal users'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.update_internal_user(
       '20000000-0000-4000-8000-000000000003',
       'Updated Launch Staff', '+44000000001', '200000003', 'staff', true,
       'Synthetic internal user details reviewed'
     ) $$,
  'administrator can update another internal user'
);
select results_eq(
  $$ select display_name from public.list_internal_user_administration_records()
     where id = '20000000-0000-4000-8000-000000000003' $$,
  array['Updated Launch Staff'],
  'reviewed display name is stored'
);
select results_eq(
  $$ select count(*) from public.audit_events
     where entity_type = 'profile'
       and entity_id = '20000000-0000-4000-8000-000000000003' $$,
  array[1::bigint],
  'internal user update is audited'
);
select throws_ok(
  $$ select public.update_internal_user(
       '20000000-0000-4000-8000-000000000001',
       'Launch Administrator', '', '', 'staff', true,
       'Attempt to demote own administrator account'
     ) $$,
  '23514', 'Administrators cannot remove their own recovery access',
  'administrator cannot demote their own recovery account'
);
select throws_ok(
  $$ select public.update_internal_user(
       '20000000-0000-4000-8000-000000000001',
       'Launch Administrator', '', '', 'administrator', false,
       'Attempt to deactivate own administrator account'
     ) $$,
  '23514', 'Administrators cannot remove their own recovery access',
  'administrator cannot deactivate their own recovery account'
);

reset "request.jwt.claim.sub";
set local role service_role;
select ok(
  (public.get_operational_readiness('development')->>'active_users')::integer >= 3,
  'service role can query bounded operational readiness'
);

select * from finish();
rollback;
