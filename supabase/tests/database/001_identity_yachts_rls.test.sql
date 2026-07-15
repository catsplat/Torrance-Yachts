begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'yachts', 'yachts table exists');
select has_table('public', 'audit_events', 'audit_events table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.yachts'::regclass),
  'yachts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass),
  'audit_events has RLS enabled'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'staff@example.test',
    '{"display_name":"Test Staff"}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'admin@example.test',
    '{"display_name":"Test Administrator"}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'inactive@example.test',
    '{"display_name":"Inactive User"}'::jsonb
  );

update public.profiles
set role = 'administrator'
where id = '10000000-0000-0000-0000-000000000002';

update public.profiles
set active = false
where id = '10000000-0000-0000-0000-000000000003';

insert into public.yachts (id, name, status)
values (
  '20000000-0000-0000-0000-000000000001',
  'RLS Test Yacht',
  'active'
);

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';

select throws_ok(
  $$ select count(*) from public.yachts $$,
  '42501',
  'permission denied for table yachts',
  'anonymous requests have no yacht table privilege'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

select results_eq(
  $$ select count(*) from public.yachts where id = '20000000-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'active staff can read yachts'
);

select lives_ok(
  $$
    insert into public.yachts (id, name, status)
    values ('20000000-0000-0000-0000-000000000002', 'Staff Created Yacht', 'active')
  $$,
  'active staff can create yachts'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '20000000-0000-0000-0000-000000000002'
      and action = 'insert'
      and actor_user_id = '10000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'staff yacht creation produces an attributed audit event'
);

select results_eq(
  $$
    update public.yachts
    set home_port = 'Test Port'
    where id = '20000000-0000-0000-0000-000000000002'
    returning home_port
  $$,
  array['Test Port'::text],
  'active staff can update yachts'
);

select is_empty(
  $$
    delete from public.yachts
    where id = '20000000-0000-0000-0000-000000000002'
    returning id
  $$,
  'staff cannot delete yachts'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';

select results_eq(
  $$ select count(*) from public.yachts $$,
  array[0::bigint],
  'inactive users cannot read yachts'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';

select results_eq(
  $$
    delete from public.yachts
    where id = '20000000-0000-0000-0000-000000000002'
    returning id
  $$,
  array['20000000-0000-0000-0000-000000000002'::uuid],
  'administrators can delete yachts'
);

select * from finish();
rollback;
