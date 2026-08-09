begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_function('public', 'list_contact_register_page', array['integer','text','uuid','boolean','public.contact_role','text'], 'contact register page function exists');
select has_function('public', 'count_contact_register', array['boolean','public.contact_role','text'], 'contact register count function exists');
select has_function('public', 'list_company_register_page', array['integer','text','uuid','boolean','text'], 'company register page function exists');
select has_function('public', 'count_company_register', array['boolean','text'], 'company register count function exists');
select has_function('public', 'list_document_register_page', array['integer','timestamp with time zone','uuid','public.document_type','public.document_scan_status','public.document_verification_status','text'], 'document register page function exists');
select has_function('public', 'count_document_register', array['public.document_type','public.document_scan_status','public.document_verification_status','text'], 'document register count function exists');
select has_function('public', 'list_my_notification_page', array['integer','timestamp with time zone','uuid','boolean'], 'notification page function exists');
select has_function('public', 'count_my_notifications', array['boolean'], 'notification count function exists');

insert into auth.users (id, email, raw_user_meta_data) values
  ('27000000-0000-4000-8000-000000000001', 'register.admin@example.test', '{"display_name":"Register Admin"}'),
  ('27000000-0000-4000-8000-000000000002', 'register.staff@example.test', '{"display_name":"Register Staff"}');
update public.profiles set role = 'administrator' where id = '27000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '27000000-0000-4000-8000-000000000001';

insert into public.contacts (id, full_name, email, roles) values
  ('27000000-0000-4000-8000-000000000011', 'Alpha Pagination Directory', 'alpha.directory@example.test', array['broker']::public.contact_role[]),
  ('27000000-0000-4000-8000-000000000012', 'Beta Pagination Directory', 'beta.directory@example.test', array['captain']::public.contact_role[]),
  ('27000000-0000-4000-8000-000000000013', 'Gamma Pagination Directory', 'gamma.directory@example.test', array['broker']::public.contact_role[]);

insert into public.companies (id, name, email) values
  ('27000000-0000-4000-8000-000000000021', 'Alpha Pagination Company', 'alpha.company@example.test'),
  ('27000000-0000-4000-8000-000000000022', 'Beta Pagination Company', 'beta.company@example.test'),
  ('27000000-0000-4000-8000-000000000023', 'Gamma Pagination Company', 'gamma.company@example.test');

select results_eq(
  $$ select public.count_contact_register(true, null, 'pagination directory') $$,
  array[3::bigint],
  'contact search counts every matching contact'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_contact_register_page(1, null, null, true, null, 'pagination directory')
    )
    select count(*) from public.list_contact_register_page(
      50, (select sort_name from first_page), (select id from first_page),
      true, null, 'pagination directory'
    )
  $$,
  array[2::bigint],
  'contact cursor returns the remaining records without replay'
);
select results_eq(
  $$ select public.count_company_register(true, 'pagination company') $$,
  array[3::bigint],
  'company search counts every matching company'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_company_register_page(1, null, null, true, 'pagination company')
    )
    select count(*) from public.list_company_register_page(
      50, (select sort_name from first_page), (select id from first_page),
      true, 'pagination company'
    )
  $$,
  array[2::bigint],
  'company cursor returns the remaining records without replay'
);

select public.create_notification(
  'pagination-admin-unread', 'pagination', 'test',
  '27000000-0000-4000-8000-000000000031',
  '27000000-0000-4000-8000-000000000001', null,
  'in_app', 'normal', 'Unread admin alert', 'Unread body', null, true
);
select public.create_notification(
  'pagination-admin-read', 'pagination', 'test',
  '27000000-0000-4000-8000-000000000032',
  '27000000-0000-4000-8000-000000000001', null,
  'in_app', 'normal', 'Read admin alert', 'Read body', null, true
);
select public.mark_notification_read(
  (select id from public.notifications where idempotency_key = 'pagination-admin-read')
);

set local "request.jwt.claim.sub" = '27000000-0000-4000-8000-000000000002';
select public.create_notification(
  'pagination-staff-unread', 'pagination', 'test',
  '27000000-0000-4000-8000-000000000033',
  '27000000-0000-4000-8000-000000000002', null,
  'in_app', 'normal', 'Staff alert', 'Staff body', null, true
);

set local "request.jwt.claim.sub" = '27000000-0000-4000-8000-000000000001';
select results_eq($$ select public.count_my_notifications(null) $$, array[2::bigint], 'notification count is scoped to the signed-in user');
select results_eq($$ select public.count_my_notifications(false) $$, array[1::bigint], 'unread notification count is exact');
set local "request.jwt.claim.sub" = '27000000-0000-4000-8000-000000000002';
select results_eq($$ select public.count_my_notifications(null) $$, array[1::bigint], 'another user sees only their notifications');

set local "request.jwt.claim.sub" = '27000000-0000-4000-8000-000000000001';
select lives_ok($$ select public.count_document_register(null, null, null, null) $$, 'document count executes under authenticated RLS');
select lives_ok($$ select * from public.list_document_register_page(50, null, null, null, null, null, null) $$, 'document page executes under authenticated RLS');

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000000';
select throws_ok($$ select public.count_contact_register(true, null, null) $$, '42501', null, 'anonymous users cannot count contacts');
select throws_ok($$ select public.count_company_register(true, null) $$, '42501', null, 'anonymous users cannot count companies');
select throws_ok($$ select public.count_document_register(null, null, null, null) $$, '42501', null, 'anonymous users cannot count documents');
select throws_ok($$ select public.count_my_notifications(null) $$, '42501', null, 'anonymous users cannot count notifications');

select * from finish();
rollback;
