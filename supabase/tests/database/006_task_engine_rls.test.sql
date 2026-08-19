begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

select has_table('public', 'task_templates', 'task templates table exists');
select has_table('public', 'task_template_steps', 'task template steps table exists');
select has_table('public', 'task_template_step_dependencies', 'template dependencies table exists');
select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'task_dependencies', 'task dependencies table exists');
select has_table('public', 'task_history', 'task history table exists');
select has_table('public', 'task_notes', 'task notes table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.task_templates'::regclass), 'task templates have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.task_history'::regclass), 'task history has RLS');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('15000000-0000-0000-0000-000000000001', 'tasks.admin@example.test', '{"display_name":"Task Administrator"}'::jsonb),
  ('15000000-0000-0000-0000-000000000002', 'tasks.inactive@example.test', '{"display_name":"Inactive Task User"}'::jsonb);
update public.profiles set role = 'administrator'
where id = '15000000-0000-0000-0000-000000000001';
update public.profiles set active = false
where id = '15000000-0000-0000-0000-000000000002';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok(
  $$ select count(*) from public.tasks $$,
  '42501', 'permission denied for table tasks',
  'anonymous users cannot read tasks'
);
select throws_ok(
  $$ select count(*) from public.task_templates $$,
  '42501', 'permission denied for table task_templates',
  'anonymous users cannot read templates'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '15000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ insert into public.tasks (booking_id, source, title)
     values ('00000000-0000-4000-8000-000000000001', 'ad_hoc', 'Bypass') $$,
  '42501', 'Tasks must be created through a controlled command',
  'direct task creation is blocked'
);
select throws_ok(
  $$ update public.task_template_steps set title = 'Bypass' where id = '91000000-0000-4000-8000-000000000001' $$,
  '42501', 'Task template steps must be changed through a controlled command',
  'direct template step editing is blocked'
);
select lives_ok(
  $$ select public.approve_task_template('90000000-0000-4000-8000-000000000001') $$,
  'administrator can approve the seeded task template'
);
select results_eq(
  $$ select status::text || ':' || is_default::text
     from public.task_templates where id = '90000000-0000-4000-8000-000000000001' $$,
  array['approved:true'],
  'approved task template becomes the default'
);
select lives_ok(
  $$ select public.approve_yacht_offer_template('83000000-0000-4000-8000-000000000001') $$,
  'offer template can be approved for booking setup'
);
select lives_ok(
  $$ select public.create_offer_draft(
    '70000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001', null,
    'Synthetic Broker', 'Synthetic task-engine offer',
    'This synthetic offer exists only to exercise task generation.', 168000
  ) $$,
  'source offer can be prepared'
);
select lives_ok(
  $$ select public.approve_offer(id, 'Reviewed synthetic terms')
     from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001' $$,
  'source offer can be approved'
);
select lives_ok(
  $$ select public.mark_offer_sent(id, 'Recorded synthetic external send')
     from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001' $$,
  'source offer can be recorded sent'
);
select lives_ok(
  $$ select public.transition_enquiry_status(
    '70000000-0000-4000-8000-000000000001', 'contract_issued', 'Synthetic contract issued'
  ) $$,
  'enquiry enters contract issued'
);
select lives_ok(
  $$ select public.transition_enquiry_status(
    '70000000-0000-4000-8000-000000000001', 'awaiting_signatures', 'Synthetic signatures requested'
  ) $$,
  'enquiry enters awaiting signatures'
);
select lives_ok(
  $$ select public.confirm_booking(
    '70000000-0000-4000-8000-000000000001'::uuid,
    (select id from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    (select id from public.yachts where name = 'M/Y Asteria'),
    '2026-08-14'::date, '2026-08-21'::date,
    'Athens'::text, 'Athens'::text, 10::smallint,
    168000::numeric, 'EUR'::text, 5::numeric, true,
    'Reviewed fully signed synthetic agreement'::text
  ) $$,
  'booking confirmation generates its task workflow atomically'
);
select results_eq(
  $$ select count(*) from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001') $$,
  array[16::bigint],
  'the complete supplied workflow contains sixteen generated records'
);
select results_eq(
  $$ select status::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '0.0' $$,
  array['completed'],
  'task-sequence milestone is completed by booking confirmation'
);
select results_eq(
  $$ select status::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '0.A' $$,
  array['ready'],
  'first operational task is ready'
);
select results_eq(
  $$ select status::text || ':' || blocked_reason from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '0.B' $$,
  array['blocked:Waiting for a prerequisite task.'],
  'dependent task begins blocked'
);
select results_eq(
  $$ select due_date::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '5' $$,
  array['2026-08-14'],
  'charter-start task is scheduled from authoritative booking dates'
);
select results_eq(
  $$ select due_date::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '7' $$,
  array['2026-08-23'],
  'broker follow-up is scheduled two days after charter end'
);
select lives_ok(
  $$ select public.amend_confirmed_booking(
    (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    (select id from public.yachts where name = 'M/Y Asteria'),
    '2026-08-15'::date, '2026-08-22'::date, 'Athens', 'Mykonos',
    10::smallint, 168000::numeric, 'EUR', 5::numeric,
    'Reviewed synthetic charter-date amendment'
  ) $$,
  'booking amendment synchronises generated schedules'
);
select results_eq(
  $$ select due_date::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '5' $$,
  array['2026-08-15'],
  'charter-start task follows amended booking dates'
);
select results_eq(
  $$ select due_date::text from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '7' $$,
  array['2026-08-24'],
  'follow-up task remains two days after amended charter end'
);
select results_eq(
  $$ select status::text || ':' || blocked_reason from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and step_code = '3' $$,
  array['blocked:Waiting for reviewed contract schedule data'],
  'payment task remains blocked until Phase 8 contract dates exist'
);
select results_eq(
  $$ select public.generate_booking_tasks(
    (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    null
  ) $$,
  array[0],
  'task generation is idempotent'
);
select results_eq(
  $$ select count(*) from public.workflow_events
     where event_type = 'BookingTasksGenerated'
       and aggregate_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001') $$,
  array[1::bigint],
  'idempotent retry does not duplicate generation events'
);
select throws_ok(
  $$ select public.complete_task(
    (select id from public.tasks where step_code = '0.B' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Attempt blocked completion'
  ) $$,
  '23514', 'Only a ready task can be completed',
  'blocked tasks cannot be completed'
);
select lives_ok(
  $$ select public.complete_task(
    (select id from public.tasks where step_code = '0.A' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Synthetic KYC request externally sent'
  ) $$,
  'ready task can be completed'
);
select results_eq(
  $$ select status::text from public.tasks
     where step_code = '0.B' and booking_id =
       (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001') $$,
  array['ready'],
  'completing a prerequisite unlocks its dependent'
);
select lives_ok(
  $$ select public.reopen_task(
    (select id from public.tasks where step_code = '0.A' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Synthetic review found more work'
  ) $$,
  'completed task can be reopened with a reason'
);
select results_eq(
  $$ select status::text from public.tasks
     where step_code = '0.B' and booking_id =
       (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001') $$,
  array['blocked'],
  'reopening a prerequisite re-blocks downstream work'
);
select throws_ok(
  $$ select public.reopen_task(
    (select id from public.tasks where step_code = '0.0' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Attempt milestone reopen'
  ) $$,
  '23514', 'This task cannot be reopened',
  'system task-sequence milestone cannot be reopened'
);
select lives_ok(
  $$ select public.update_task_schedule(
    (select id from public.tasks where step_code = '3' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    '2026-07-30'::date, '15000000-0000-0000-0000-000000000001'::uuid,
    'urgent', 'Reviewed first instalment date from synthetic contract'
  ) $$,
  'reviewed due date and assignment can be recorded'
);
select results_eq(
  $$ select due_date::text || ':' || assigned_user_id::text from public.tasks
     where step_code = '3' and booking_id =
       (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001') $$,
  array['2026-07-30:15000000-0000-0000-0000-000000000001'],
  'task schedule changes persist'
);
select lives_ok(
  $$ select public.add_ad_hoc_task(
    (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    'Synthetic ad-hoc operational check', 'Created for task-engine testing.',
    '2026-08-01'::date, 'normal', null
  ) $$,
  'staff can add a permitted ad-hoc task'
);
select results_eq(
  $$ select source::text || ':' || required::text || ':' || status::text
     from public.tasks where title = 'Synthetic ad-hoc operational check' $$,
  array['ad_hoc:false:ready'],
  'ad-hoc task provenance and optional state are explicit'
);
select lives_ok(
  $$ select public.add_task_note(
    (select id from public.tasks where title = 'Synthetic ad-hoc operational check'),
    'Synthetic append-only task note.'
  ) $$,
  'task notes can be appended'
);
select results_eq(
  $$ select body from public.task_notes
     where task_id = (select id from public.tasks where title = 'Synthetic ad-hoc operational check') $$,
  array['Synthetic append-only task note.'],
  'task note is retained'
);
select lives_ok(
  $$ select public.cancel_ad_hoc_task(
    (select id from public.tasks where title = 'Synthetic ad-hoc operational check'),
    'Synthetic ad-hoc work no longer required'
  ) $$,
  'ad-hoc task can be cancelled with a reason'
);
select throws_ok(
  $$ select public.cancel_ad_hoc_task(
    (select id from public.tasks where step_code = '0.B' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Attempt template cancellation'
  ) $$,
  '23514', 'Only an ad-hoc task can be cancelled',
  'template tasks cannot be deleted or cancelled ad hoc'
);
select throws_ok(
  $$ select public.complete_task(
    (select id from public.tasks where step_code = '1.E' and booking_id =
      (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')),
    'Attempt before Yachtfolio evidence'
  ) $$,
  '23514', 'Only a ready task can be completed',
  'Yachtfolio task remains dependency controlled'
);
select lives_ok(
  $$ select public.clone_task_template(
    '90000000-0000-4000-8000-000000000001', 'Standard charter booking workflow'
  ) $$,
  'administrator can clone a template into a draft version'
);
select results_eq(
  $$ select count(*) from public.task_template_steps
     where template_id = (
       select id from public.task_templates
       where name = 'Standard charter booking workflow' and version_number = 2
     ) $$,
  array[16::bigint],
  'template clone preserves all configured steps'
);
select results_eq(
  $$ select count(*) from public.task_template_step_dependencies
     where step_id in (
       select id from public.task_template_steps
       where template_id = (
         select id from public.task_templates
         where name = 'Standard charter booking workflow' and version_number = 2
       )
     ) $$,
  array[13::bigint],
  'template clone preserves dependency graph'
);
select lives_ok(
  $$ select public.update_task_template_step(
    (select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.name = 'Standard charter booking workflow' and t.version_number = 2
        and s.step_code = '0.A'),
    'Request KYC statement and passport', 'Edited synthetic draft step.',
    'urgent', true, 'booking_confirmed', 0, true, 0::smallint, 1::smallint
  ) $$,
  'administrator can edit a draft template step'
);
select lives_ok(
  $$ select public.add_task_template_step(
    (select id from public.task_templates
     where name = 'Standard charter booking workflow' and version_number = 2),
    '8.A', 'Synthetic added draft step', 'Draft-only structural test.',
    'normal', false, 'none', 0, false, null, null, 160
  ) $$,
  'administrator can add a draft template step'
);
select lives_ok(
  $$ select public.replace_task_template_dependencies(
    (select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.version_number = 2 and s.step_code = '8.A'),
    array[(select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.version_number = 2 and s.step_code = '0.A')]
  ) $$,
  'administrator can configure draft dependencies'
);
select throws_ok(
  $$ select public.replace_task_template_dependencies(
    (select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.version_number = 2 and s.step_code = '0.A'),
    array[(select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.version_number = 2 and s.step_code = '8.A')]
  ) $$,
  '23514', 'Task template dependency would create a cycle',
  'template dependency cycles are rejected'
);
select lives_ok(
  $$ select public.delete_task_template_step(
    (select s.id from public.task_template_steps s
      join public.task_templates t on t.id = s.template_id
      where t.version_number = 2 and s.step_code = '8.A')
    , 'Removed synthetic draft step after structural test'
  ) $$,
  'administrator can remove an unapproved draft step'
);
select results_eq(
  $$ select count(*) from public.task_template_steps
     where template_id = (
       select id from public.task_templates
       where name = 'Standard charter booking workflow' and version_number = 2
     ) $$,
  array[16::bigint],
  'draft structural edit leaves the intended final step count'
);
select lives_ok(
  $$ select public.approve_task_template(
    (select id from public.task_templates
     where name = 'Standard charter booking workflow' and version_number = 2)
  ) $$,
  'administrator can approve a new template version'
);
select results_eq(
  $$ select count(*) filter (where status = 'approved' and is_default)
       || ':' || count(*) filter (where status = 'retired')
     from public.task_templates where name = 'Standard charter booking workflow' $$,
  array['1:1'],
  'approving a version retires the previous default'
);
select throws_ok(
  $$ update public.tasks set status = 'completed' where step_code = '0.B' $$,
  '42501', 'Tasks must be changed through a controlled command',
  'direct task lifecycle mutation is blocked'
);
select throws_ok(
  $$ delete from public.tasks where source = 'ad_hoc' $$,
  '42501', 'permission denied for table tasks',
  'tasks cannot be deleted'
);
select lives_ok(
  $$ select public.transition_booking_status(
    (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    'cancelled', 'Synthetic booking cancellation'
  ) $$,
  'booking cancellation closes remaining work'
);
select results_eq(
  $$ select count(*) from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and status in ('ready', 'blocked') $$,
  array[1::bigint],
  'cancelled booking leaves one confirmation task'
);
select results_eq(
  $$ select count(*) from public.tasks
     where booking_id = (select id from public.bookings where enquiry_id = '70000000-0000-4000-8000-000000000001')
       and title = 'Confirm cancellation' and status = 'ready' $$,
  array[1::bigint],
  'cancellation creates a ready confirmation task'
);

set local "request.jwt.claim.sub" = '15000000-0000-0000-0000-000000000002';
select results_eq($$ select count(*) from public.tasks $$, array[0::bigint], 'inactive users cannot read tasks');
select throws_ok(
  $$ select public.add_ad_hoc_task(
    (select id from public.bookings limit 1), 'Rejected task', null, null, 'normal', null
  ) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot invoke task commands'
);

select * from finish();
rollback;
