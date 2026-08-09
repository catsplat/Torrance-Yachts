begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function(
  'public', 'list_offer_register_page',
  array['integer', 'timestamp with time zone', 'uuid', 'public.offer_status', 'uuid', 'text'],
  'cursor-based offer register function exists'
);
select has_function(
  'public', 'count_offer_register',
  array['public.offer_status', 'uuid', 'text'],
  'offer register count function exists'
);
select has_function(
  'public', 'list_booking_register_page',
  array['integer', 'date', 'uuid', 'public.booking_status', 'uuid', 'text'],
  'cursor-based booking register function exists'
);
select has_function(
  'public', 'count_booking_register',
  array['public.booking_status', 'uuid', 'text'],
  'booking register count function exists'
);
select has_function(
  'public', 'list_task_register_page',
  array['integer', 'date', 'timestamp with time zone', 'uuid', 'public.task_status', 'public.task_priority', 'text', 'uuid', 'boolean', 'text'],
  'cursor-based task register function exists'
);
select has_function(
  'public', 'count_task_register',
  array['public.task_status', 'public.task_priority', 'text', 'uuid', 'boolean', 'text'],
  'task register count function exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '26000000-0000-4000-8000-000000000001',
  'remaining.pagination.admin@example.test',
  '{"display_name":"Register Pagination Admin"}'::jsonb
);
update public.profiles set role = 'administrator'
where id = '26000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '26000000-0000-4000-8000-000000000001';
select public.create_rehearsal_run('Remaining register pagination');
select public.configure_rehearsal_fixture_yacht(
  (select id from public.rehearsal_runs where label = 'Remaining register pagination')
);

insert into public.contacts (id, full_name, email, roles)
values (
  '26000000-0000-4000-8000-000000000002',
  'Register Pagination Customer',
  'register.pagination.customer@example.test',
  array['charterer']::public.contact_role[]
);

insert into public.enquiries (
  id, customer_contact_id, requested_yacht_id, source, summary,
  charter_start_date, charter_end_date, guest_count, embarkation_port,
  disembarkation_port, budget_amount, currency
) values
  (
    '26000000-0000-4000-8000-000000000011',
    '26000000-0000-4000-8000-000000000002',
    (select entity_id from public.rehearsal_run_records where entity_type = 'yacht' and rehearsal_run_id = (select id from public.rehearsal_runs where label = 'Remaining register pagination')),
    'manual', 'Register pagination charter one',
    '2029-06-01', '2029-06-08', 10, 'Athens', 'Athens', 168000, 'EUR'
  ),
  (
    '26000000-0000-4000-8000-000000000012',
    '26000000-0000-4000-8000-000000000002',
    (select entity_id from public.rehearsal_run_records where entity_type = 'yacht' and rehearsal_run_id = (select id from public.rehearsal_runs where label = 'Remaining register pagination')),
    'manual', 'Register pagination charter two',
    '2029-07-01', '2029-07-08', 10, 'Athens', 'Athens', 168000, 'EUR'
  );

select public.create_offer_draft(
  enquiry.id,
  (select id from public.yacht_offer_templates where yacht_id = enquiry.requested_yacht_id and status = 'approved'),
  (select id from public.yacht_rate_periods where yacht_id = enquiry.requested_yacht_id and active),
  null, 'Register Pagination Customer',
  'Register pagination offer ' || enquiry.id::text,
  'Offer content for complete server-side register pagination testing.',
  168000
)
from public.enquiries enquiry
where enquiry.id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
);

select public.approve_offer(offer.id, 'Approved register pagination fixture')
from public.offers offer
where offer.enquiry_id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
);
select public.mark_offer_sent(offer.id, 'Sent register pagination fixture')
from public.offers offer
where offer.enquiry_id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
);
select public.transition_enquiry_status(enquiry.id, 'contract_issued', 'Contract issued for pagination fixture')
from public.enquiries enquiry
where enquiry.id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
);
select public.transition_enquiry_status(enquiry.id, 'awaiting_signatures', 'Signatures reviewed for pagination fixture')
from public.enquiries enquiry
where enquiry.id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
);
select public.approve_task_template('90000000-0000-4000-8000-000000000001');
select public.confirm_booking(
  enquiry.id,
  (select id from public.offers where enquiry_id = enquiry.id),
  enquiry.requested_yacht_id,
  enquiry.charter_start_date,
  enquiry.charter_end_date,
  enquiry.embarkation_port,
  enquiry.disembarkation_port,
  enquiry.guest_count,
  168000,
  'EUR',
  5,
  true,
  'Signed agreement reviewed for register pagination fixture'
)
from public.enquiries enquiry
where enquiry.id in (
  '26000000-0000-4000-8000-000000000011',
  '26000000-0000-4000-8000-000000000012'
)
order by enquiry.charter_start_date;

select results_eq(
  $$ select public.count_offer_register(null, null, 'register pagination offer') $$,
  array[2::bigint],
  'offer search counts the complete matching dataset'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_offer_register_page(1, null, null, null, null, 'register pagination offer')
    )
    select count(*) from public.list_offer_register_page(
      100,
      (select updated_at from first_page),
      (select id from first_page),
      null, null, 'register pagination offer'
    )
  $$,
  array[1::bigint],
  'offer cursor returns the remaining record without replay'
);

select results_eq(
  $$ select public.count_booking_register(null, null, 'register pagination charter') $$,
  array[2::bigint],
  'booking search counts the complete matching dataset'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_booking_register_page(1, null, null, null, null, 'register pagination charter')
    )
    select count(*) from public.list_booking_register_page(
      100,
      (select charter_start_date from first_page),
      (select id from first_page),
      null, null, 'register pagination charter'
    )
  $$,
  array[1::bigint],
  'booking cursor returns the remaining record without replay'
);

select results_eq(
  $$ select public.count_task_register(null, null, null, null, false, null) $$,
  array[32::bigint],
  'task search counts generated work across both matching bookings'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_task_register_page(5, null, null, null, null, null, null, null, false, null)
    ), cursor as (
      select due_sort, created_at, id from first_page
      order by due_sort, created_at desc, id desc offset 4 limit 1
    )
    select count(*) from public.list_task_register_page(
      100,
      (select due_sort from cursor),
      (select created_at from cursor),
      (select id from cursor),
      null, null, null, null, false, null
    )
  $$,
  array[27::bigint],
  'task cursor preserves the due-date and creation ordering'
);

select throws_ok(
  $$ select * from public.list_offer_register_page(10, now(), null, null, null, null) $$,
  '22023', 'Pagination cursor is incomplete',
  'partial offer cursors are rejected'
);
select throws_ok(
  $$ select * from public.list_booking_register_page(10, current_date, null, null, null, null) $$,
  '22023', 'Pagination cursor is incomplete',
  'partial booking cursors are rejected'
);
select throws_ok(
  $$ select * from public.list_task_register_page(10, current_date, null, null, null, null, null, null, false, null) $$,
  '22023', 'Pagination cursor is incomplete',
  'partial task cursors are rejected'
);
select throws_ok(
  $$ select public.count_task_register(null, null, 'invalid', null, false, null) $$,
  '22023', 'Unknown due-state filter',
  'unknown task due-state filters fail closed'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.list_offer_register_page(10, null, null, null, null, null) $$,
  '42501', 'permission denied for function list_offer_register_page',
  'anonymous callers cannot list offers'
);
select throws_ok(
  $$ select * from public.list_booking_register_page(10, null, null, null, null, null) $$,
  '42501', 'permission denied for function list_booking_register_page',
  'anonymous callers cannot list bookings'
);
select throws_ok(
  $$ select * from public.list_task_register_page(10, null, null, null, null, null, null, null, false, null) $$,
  '42501', 'permission denied for function list_task_register_page',
  'anonymous callers cannot list tasks'
);

select * from finish();
rollback;
