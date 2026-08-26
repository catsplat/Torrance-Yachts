begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public', 'yacht_availability_blocks', 'availability blocks table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.yacht_availability_blocks'::regclass), 'availability blocks have RLS');

insert into auth.users (id, email, raw_user_meta_data)
values ('44000000-0000-0000-0000-000000000001', 'manual.booking@example.test', '{"display_name":"Manual Booking Staff"}'::jsonb);
update public.profiles set role = 'administrator' where id = '44000000-0000-0000-0000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '44000000-0000-0000-0000-000000000001';

select lives_ok($$ select public.approve_task_template('90000000-0000-4000-8000-000000000001') $$, 'default workflow can be approved for manual charter testing');
select lives_ok($$ select public.create_manual_booking((select id from public.yachts where name = 'M/Y Asteria'),'2028-06-10'::date,'2028-06-17'::date,'Athens'::text,'Athens'::text,8::smallint,150000::numeric,'EUR'::text,5::numeric,null::uuid,null::uuid,null::uuid,true,'Reviewed a fully signed charter entered outside the enquiry workflow'::text) $$, 'signed manual charter can be created');
select results_eq($$ select origin::text || ':' || (enquiry_id is null)::text || ':' || (source_offer_id is null)::text from public.bookings where origin = 'manual' $$, array['manual:true:true'], 'manual charter does not create synthetic source records');
select results_eq($$ select reserved_from::text || ':' || reserved_through::text from public.booking_reservations where booking_id = (select id from public.bookings where origin='manual') $$, array['2028-06-09:2028-06-18'], 'manual charter has the standard one-day buffer');
select ok((select count(*) >= 16 from public.tasks where booking_id = (select id from public.bookings where origin='manual')), 'manual charter starts the default workflow');
select results_eq($$ select available from public.check_yacht_availability((select id from public.yachts where name='M/Y Asteria'),'2028-06-17','2028-06-20',null) $$, array[false], 'manual charter buffer protects availability');

select lives_ok($$ select public.create_yacht_availability_block((select id from public.yachts where name='M/Y Asteria'),'Owner use','2028-07-10','2028-07-17','Synthetic availability-only hold') $$, 'availability block can be created');
select results_eq($$ select count(*) from public.tasks where booking_id is null $$, array[0::bigint], 'availability block creates no booking tasks');
select results_eq($$ select available from public.check_yacht_availability((select id from public.yachts where name='M/Y Asteria'),'2028-07-17','2028-07-20',null) $$, array[false], 'availability block protects buffered dates');
select lives_ok($$ select public.amend_yacht_availability_block((select id from public.yacht_availability_blocks where title = 'Owner use'), (select id from public.yachts where name='M/Y Asteria'), 'Owner use — amended', '2028-07-11'::date, '2028-07-18'::date, 'Synthetic amended hold', 'Owner dates changed') $$, 'availability block can be amended with an audit reason');
select results_eq($$ select last_change_reason from public.yacht_availability_blocks where title = 'Owner use — amended' $$, array['Owner dates changed'], 'availability block retains its latest audited reason');
select lives_ok($$ select public.cancel_yacht_availability_block((select id from public.yacht_availability_blocks where title = 'Owner use — amended'), 'Owner use no longer required') $$, 'availability block can be cancelled without deleting history');
select throws_ok($$ insert into public.yacht_availability_blocks (yacht_id,title,charter_start_date,charter_end_date,reserved_from,reserved_through,created_by) values ((select id from public.yachts where name='M/Y Asteria'),'Bypass','2028-08-01','2028-08-03','2028-07-31','2028-08-04','44000000-0000-0000-0000-000000000001') $$, '42501', 'Availability blocks must be changed through a controlled command', 'direct availability block creation is blocked');

select * from finish();
rollback;
