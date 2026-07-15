begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

select has_table('public', 'enquiries', 'enquiries table exists');
select has_table(
  'public',
  'enquiry_status_history',
  'enquiry status history table exists'
);
select has_table('public', 'enquiry_notes', 'enquiry notes table exists');
select has_table('public', 'workflow_events', 'workflow events table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.enquiries'::regclass),
  'enquiries has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.enquiry_status_history'::regclass
  ),
  'enquiry history has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.enquiry_notes'::regclass),
  'enquiry notes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.workflow_events'::regclass),
  'workflow events has RLS enabled'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '12000000-0000-0000-0000-000000000001',
    'enquiry.staff@example.test',
    '{"display_name":"Enquiry Staff"}'::jsonb
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    'enquiry.admin@example.test',
    '{"display_name":"Enquiry Administrator"}'::jsonb
  ),
  (
    '12000000-0000-0000-0000-000000000003',
    'enquiry.inactive@example.test',
    '{"display_name":"Inactive Enquiry User"}'::jsonb
  );

update public.profiles
set role = 'administrator'
where id = '12000000-0000-0000-0000-000000000002';

update public.profiles
set active = false
where id = '12000000-0000-0000-0000-000000000003';

insert into public.contacts (id, full_name, email, roles)
values
  (
    '42000000-0000-0000-0000-000000000001',
    'Enquiry Test Customer',
    'enquiry.customer@example.test',
    array['customer']::public.contact_role[]
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    'Enquiry Test Supplier',
    'enquiry.supplier@example.test',
    array['supplier']::public.contact_role[]
  );

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';

select throws_ok(
  $$ select count(*) from public.enquiries $$,
  '42501',
  'permission denied for table enquiries',
  'anonymous requests have no enquiry table privilege'
);

select throws_ok(
  $$ select count(*) from public.workflow_events $$,
  '42501',
  'permission denied for table workflow_events',
  'anonymous requests have no workflow event privilege'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    insert into public.enquiries (
      id,
      customer_contact_id,
      owner_user_id,
      summary,
      charter_start_date,
      charter_end_date,
      guest_count
    )
    values (
      '72000000-0000-4000-8000-000000000001',
      '42000000-0000-0000-0000-000000000001',
      '12000000-0000-0000-0000-000000000001',
      'Synthetic enquiry used by the Phase 4 database test.',
      '2026-10-01',
      '2026-10-08',
      10
    )
  $$,
  'active staff can create an enquiry'
);

select ok(
  (
    select created_by = '12000000-0000-0000-0000-000000000001'
      and updated_by = '12000000-0000-0000-0000-000000000001'
    from public.enquiries
    where id = '72000000-0000-4000-8000-000000000001'
  ),
  'enquiry creation records the acting user'
);

select ok(
  (
    select reference ~ '^ENQ-[0-9]{4}-[0-9]{4,}$'
    from public.enquiries
    where id = '72000000-0000-4000-8000-000000000001'
  ),
  'enquiry creation generates a human-readable reference'
);

select results_eq(
  $$
    select status::text
    from public.enquiries
    where id = '72000000-0000-4000-8000-000000000001'
  $$,
  array['new'::text],
  'enquiries always begin in the new state'
);

select results_eq(
  $$
    select count(*)
    from public.enquiry_status_history
    where enquiry_id = '72000000-0000-4000-8000-000000000001'
      and from_status is null
      and to_status = 'new'
      and reason = 'Enquiry created'
      and changed_by = '12000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'enquiry creation records attributed lifecycle history'
);

select results_eq(
  $$
    select count(*)
    from public.workflow_events
    where aggregate_id = '72000000-0000-4000-8000-000000000001'
      and event_type = 'EnquiryCreated'
      and actor_user_id = '12000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'enquiry creation emits a durable event'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '72000000-0000-4000-8000-000000000001'
      and entity_type = 'enquiry'
      and action = 'insert'
      and actor_user_id = '12000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'enquiry creation produces an attributed audit event'
);

select throws_ok(
  $$
    update public.enquiries
    set status = 'waiting_for_reply'
    where id = '72000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'Enquiry status must be changed through the transition command',
  'direct enquiry status updates are rejected'
);

select lives_ok(
  $$
    select public.transition_enquiry_status(
      '72000000-0000-4000-8000-000000000001',
      'waiting_for_reply',
      'Initial response prepared for review'
    )
  $$,
  'a valid state transition succeeds through the command'
);

select results_eq(
  $$
    select status::text
    from public.enquiries
    where id = '72000000-0000-4000-8000-000000000001'
  $$,
  array['waiting_for_reply'::text],
  'the valid transition updates the enquiry state'
);

select results_eq(
  $$
    select count(*)
    from public.enquiry_status_history
    where enquiry_id = '72000000-0000-4000-8000-000000000001'
      and from_status = 'new'
      and to_status = 'waiting_for_reply'
      and reason = 'Initial response prepared for review'
      and changed_by = '12000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'the transition reason is preserved in lifecycle history'
);

select results_eq(
  $$
    select count(*)
    from public.workflow_events
    where aggregate_id = '72000000-0000-4000-8000-000000000001'
      and event_type = 'EnquiryStatusChanged'
      and payload ->> 'to_status' = 'waiting_for_reply'
  $$,
  array[1::bigint],
  'the transition emits a durable status-change event'
);

select throws_ok(
  $$
    select public.transition_enquiry_status(
      '72000000-0000-4000-8000-000000000001',
      'awaiting_signatures',
      'Attempt to skip required states'
    )
  $$,
  '23514',
  'Invalid enquiry status transition from waiting_for_reply to awaiting_signatures',
  'the state machine rejects skipped lifecycle stages'
);

select throws_ok(
  $$
    select public.transition_enquiry_status(
      '72000000-0000-4000-8000-000000000001',
      'booked',
      'Attempt to bypass future booking confirmation'
    )
  $$,
  '23514',
  'Invalid enquiry status transition from waiting_for_reply to booked',
  'Phase 4 cannot bypass the future booking confirmation command'
);

select lives_ok(
  $$
    insert into public.enquiry_notes (id, enquiry_id, kind, body)
    values (
      '82000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000001',
      'requirement',
      'Guest requests a synthetic family-friendly itinerary.'
    )
  $$,
  'active staff can add an enquiry note'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '82000000-0000-4000-8000-000000000001'
      and entity_type = 'enquiry_note'
      and action = 'insert'
      and actor_user_id = '12000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'enquiry notes produce attributed audit events'
);

select throws_ok(
  $$
    update public.enquiry_notes
    set body = 'Rewritten note'
    where id = '82000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table enquiry_notes',
  'enquiry notes cannot be rewritten'
);

select throws_ok(
  $$
    delete from public.enquiry_notes
    where id = '82000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table enquiry_notes',
  'enquiry notes cannot be deleted'
);

select throws_ok(
  $$
    insert into public.enquiry_status_history (
      enquiry_id,
      to_status,
      reason
    )
    values (
      '72000000-0000-4000-8000-000000000001',
      'offer_sent',
      'Forged history'
    )
  $$,
  '42501',
  'permission denied for table enquiry_status_history',
  'application users cannot forge lifecycle history'
);

select throws_ok(
  $$
    insert into public.workflow_events (event_type, aggregate_type, aggregate_id)
    values (
      'EnquiryCreated',
      'enquiry',
      '72000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  'permission denied for table workflow_events',
  'application users cannot forge workflow events'
);

select throws_ok(
  $$
    insert into public.enquiries (
      customer_contact_id,
      summary,
      charter_start_date,
      charter_end_date
    )
    values (
      '42000000-0000-0000-0000-000000000001',
      'Reversed dates',
      '2026-11-08',
      '2026-11-01'
    )
  $$,
  '23514',
  'new row for relation "enquiries" violates check constraint "enquiries_charter_date_order"',
  'charter end cannot precede charter start'
);

select throws_ok(
  $$
    insert into public.enquiries (summary)
    values ('Missing requester')
  $$,
  '23514',
  'new row for relation "enquiries" violates check constraint "enquiries_requester_required"',
  'an enquiry requires at least one requester identity'
);

select throws_ok(
  $$
    insert into public.enquiries (
      customer_contact_id,
      summary,
      budget_amount
    )
    values (
      '42000000-0000-0000-0000-000000000001',
      'Budget without currency',
      100000
    )
  $$,
  '23514',
  'new row for relation "enquiries" violates check constraint "enquiries_budget_currency_together"',
  'budget and currency must be supplied together'
);

select throws_ok(
  $$
    insert into public.enquiries (broker_contact_id, summary)
    values (
      '42000000-0000-0000-0000-000000000002',
      'Incorrect broker role'
    )
  $$,
  '23514',
  'Broker must be an active broker contact',
  'broker assignment requires an active broker role'
);

select throws_ok(
  $$
    insert into public.enquiries (
      customer_contact_id,
      owner_user_id,
      summary
    )
    values (
      '42000000-0000-0000-0000-000000000001',
      '12000000-0000-0000-0000-000000000003',
      'Inactive owner assignment'
    )
  $$,
  '23514',
  'Enquiry owner must be an active internal user',
  'enquiry ownership requires an active internal user'
);

set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000003';

select results_eq(
  $$ select count(*) from public.enquiries $$,
  array[0::bigint],
  'inactive users cannot read enquiries'
);

set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000002';

select throws_ok(
  $$
    delete from public.enquiries
    where id = '72000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table enquiries',
  'even administrators preserve enquiry history instead of hard deleting it'
);

select * from finish();
rollback;
