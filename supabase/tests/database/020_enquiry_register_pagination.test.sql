begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function(
  'public',
  'list_enquiry_register_page',
  array['integer', 'timestamp with time zone', 'uuid', 'public.enquiry_status', 'boolean', 'public.enquiry_priority', 'uuid', 'text'],
  'cursor-based enquiry register function exists'
);
select has_function(
  'public',
  'count_enquiry_register',
  array['public.enquiry_status', 'boolean', 'public.enquiry_priority', 'uuid', 'text'],
  'enquiry register count function exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '22000000-0000-4000-8000-000000000001',
  'pagination.staff@example.test',
  '{"display_name":"Pagination Staff"}'::jsonb
);
insert into public.contacts (id, full_name, email, roles)
values (
  '22000000-0000-4000-8000-000000000002',
  'Pagination Customer',
  'pagination.customer@example.test',
  array['customer']::public.contact_role[]
);

set local role authenticated;
set local "request.jwt.claim.sub" = '22000000-0000-4000-8000-000000000001';
insert into public.enquiries (id, customer_contact_id, owner_user_id, summary)
values
  ('22000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'Historic cursor rehearsal request one'),
  ('22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'Historic cursor rehearsal request two'),
  ('22000000-0000-4000-8000-000000000013', '22000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'Historic cursor rehearsal request three');

select results_eq(
  $$ select count(*) from public.list_enquiry_register_page(100, null, null, null, false, null, null, 'historic cursor') $$,
  array[3::bigint],
  'case-insensitive search is performed inside the register query'
);
select results_eq(
  $$ select public.count_enquiry_register(null, false, null, null, 'historic cursor') $$,
  array[3::bigint],
  'matching count is accurate across the whole query'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_enquiry_register_page(2, null, null, null, false, null, null, 'historic cursor')
    ), cursor as (
      select updated_at, id from first_page order by updated_at desc, id desc offset 1 limit 1
    )
    select count(*)
    from public.list_enquiry_register_page(
      2,
      (select updated_at from cursor),
      (select id from cursor),
      null, false, null, null, 'historic cursor'
    )
  $$,
  array[1::bigint],
  'the next cursor returns the remaining record without replaying the page'
);
select throws_ok(
  $$ select * from public.list_enquiry_register_page(10, now(), null, null, false, null, null, null) $$,
  '22023',
  'Pagination cursor is incomplete',
  'partial cursors are rejected'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.list_enquiry_register_page(10, null, null, null, false, null, null, null) $$,
  '42501',
  'permission denied for function list_enquiry_register_page',
  'anonymous callers cannot execute the register query'
);

select * from finish();
rollback;
