begin;
-- Transaction-local fixture: independent of prior interactive template approval.
select set_config('app.task_template_update_authorised','yes',true);
update public.task_templates set status='draft',is_default=false,approved_by=null,approved_at=null where id='90000000-0000-4000-8000-000000000001';
select set_config('app.task_template_update_authorised','',true);
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'booking_reservations', 'booking reservations table exists');
select has_table('public', 'booking_status_history', 'booking status history exists');
select has_table('public', 'yachtfolio_booking_actions', 'Yachtfolio action table exists');
select has_table('public', 'yachtfolio_action_history', 'Yachtfolio action history exists');
select ok((select relrowsecurity from pg_class where oid = 'public.bookings'::regclass), 'bookings has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.booking_reservations'::regclass), 'reservations has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.yachtfolio_booking_actions'::regclass), 'Yachtfolio actions have RLS');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('14000000-0000-0000-0000-000000000001', 'booking.staff@example.test', '{"display_name":"Booking Staff"}'::jsonb),
  ('14000000-0000-0000-0000-000000000002', 'booking.inactive@example.test', '{"display_name":"Inactive Booking User"}'::jsonb);
update public.profiles set active = false where id = '14000000-0000-0000-0000-000000000002';
update public.profiles set role = 'administrator' where id = '14000000-0000-0000-0000-000000000001';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok($$ select count(*) from public.bookings $$, '42501', 'permission denied for table bookings', 'anonymous users cannot read bookings');
select throws_ok($$ select count(*) from public.booking_reservations $$, '42501', 'permission denied for table booking_reservations', 'anonymous users cannot read reservations');

set local role authenticated;
set local "request.jwt.claim.sub" = '14000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ insert into public.bookings (enquiry_id,source_offer_id,yacht_id,charter_start_date,charter_end_date,charter_fee,currency,tax_rate,signed_agreement_confirmed_by,confirmation_reason)
     values ('70000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',(select id from public.yachts where name='M/Y Asteria'),'2026-08-14','2026-08-21',168000,'EUR',5,'14000000-0000-0000-0000-000000000001','Bypass') $$,
  '42501', 'Bookings must be created through the confirmation command',
  'direct booking creation is blocked'
);

select lives_ok(
  $$ select public.approve_yacht_offer_template('83000000-0000-4000-8000-000000000001') $$,
  'synthetic offer template can be approved for command setup'
);

select lives_ok(
  $$ select public.create_offer_draft(
    '70000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001', null,
    'Synthetic Broker', 'Synthetic reviewed booking offer',
    'This is a synthetic offer body used only for database booking tests.', 168000
  ) $$,
  'reviewable source offer can be prepared'
);

select lives_ok(
  $$ select public.approve_offer(id, 'Reviewed synthetic commercial terms') from public.offers where enquiry_id='70000000-0000-4000-8000-000000000001' $$,
  'source offer can be approved'
);
select lives_ok(
  $$ select public.mark_offer_sent(id, 'Recorded synthetic external send') from public.offers where enquiry_id='70000000-0000-4000-8000-000000000001' $$,
  'source offer can be recorded sent'
);
select lives_ok(
  $$ select public.transition_enquiry_status('70000000-0000-4000-8000-000000000001','contract_issued','Synthetic contract issued') $$,
  'enquiry can move to contract issued'
);
select lives_ok(
  $$ select public.transition_enquiry_status('70000000-0000-4000-8000-000000000001','awaiting_signatures','Synthetic contract sent for signatures') $$,
  'enquiry can move to awaiting signatures'
);
select lives_ok(
  $$ select public.approve_task_template('90000000-0000-4000-8000-000000000001') $$,
  'default booking task template can be approved'
);

select throws_ok(
  $$ select public.transition_enquiry_status('70000000-0000-4000-8000-000000000001','booked','Attempt direct booking') $$,
  '42501', 'Booking lifecycle states are controlled by booking commands',
  'generic enquiry command cannot manufacture a booking'
);
select throws_ok(
  $$ select public.confirm_booking('70000000-0000-4000-8000-000000000001'::uuid,(select id from public.offers where enquiry_id='70000000-0000-4000-8000-000000000001'),(select id from public.yachts where name='M/Y Asteria'),'2026-08-14'::date,'2026-08-21'::date,'Athens'::text,'Athens'::text,10::smallint,168000::numeric,'EUR'::text,5::numeric,false,'Not actually signed'::text) $$,
  '23514', 'All required signatures must be explicitly confirmed',
  'booking requires explicit signature attestation'
);
select lives_ok(
  $$ select public.confirm_booking('70000000-0000-4000-8000-000000000001'::uuid,(select id from public.offers where enquiry_id='70000000-0000-4000-8000-000000000001'),(select id from public.yachts where name='M/Y Asteria'),'2026-08-14'::date,'2026-08-21'::date,'Athens'::text,'Athens'::text,10::smallint,168000::numeric,'EUR'::text,5::numeric,true,'Reviewed fully signed synthetic agreement'::text) $$,
  'human confirmation creates the booking transaction'
);

select results_eq($$ select status::text from public.enquiries where id='70000000-0000-4000-8000-000000000001' $$, array['booked'], 'linked enquiry becomes booked');
select results_eq($$ select reserved_from::text || ':' || reserved_through::text from public.booking_reservations $$, array['2026-08-13:2026-08-22'], 'reservation adds one full day on each side');
select results_eq($$ select status::text from public.yachtfolio_booking_actions $$, array['pending'], 'Yachtfolio action starts pending');
select results_eq($$ select event_type from public.workflow_events where aggregate_type='booking' order by occurred_at limit 1 $$, array['BookingConfirmed'], 'confirmation emits durable event');
select results_eq($$ select available from public.check_yacht_availability((select id from public.yachts where name='M/Y Asteria'),'2026-08-22','2026-08-25',null) $$, array[false], 'availability detects overlap with operational buffer');

select lives_ok(
  $$ select public.set_yachtfolio_action_status(id,'completed','Verified dates and Booked status in synthetic Yachtfolio test') from public.yachtfolio_booking_actions $$,
  'manual Yachtfolio completion can be recorded'
);
select results_eq($$ select count(*) from public.yachtfolio_action_history $$, array[1::bigint], 'Yachtfolio completion has append-only history');
select lives_ok(
  $$ select public.transition_booking_status(id,'charter_active','Synthetic charter commenced') from public.bookings $$,
  'confirmed booking can start charter'
);
select results_eq($$ select status::text from public.enquiries where id='70000000-0000-4000-8000-000000000001' $$, array['charter_active'], 'booking lifecycle advances enquiry');
select throws_ok($$ delete from public.bookings $$, '42501', 'permission denied for table bookings', 'application users cannot delete booking history');

set local "request.jwt.claim.sub" = '14000000-0000-0000-0000-000000000002';
select results_eq($$ select count(*) from public.bookings $$, array[0::bigint], 'inactive users cannot read bookings');
select throws_ok(
  $$ select * from public.check_yacht_availability((select id from public.yachts limit 1),'2026-08-01','2026-08-08',null) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot invoke availability checks'
);
select throws_ok(
  $$ select public.transition_booking_status('00000000-0000-0000-0000-000000000000','cancelled','Rejected') $$,
  '42501', 'An active internal account is required',
  'inactive users cannot invoke booking commands'
);

select * from finish();
rollback;
